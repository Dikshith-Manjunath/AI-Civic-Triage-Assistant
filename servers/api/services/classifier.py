"""Laya Classifier Client — HTTP and SDK interface for civic complaint classification.

This module provides a unified interface to the Laya decision engine for classifying
civic complaints. It supports both:
1. Local SDK mode (preferred) - direct Python import, no network overhead
2. HTTP mode - connects to a remote Laya server

The classifier determines:
- Department: roads, sanitation, water, electricity, transport, housing, planning
- Authority: BBMP, BWSSB, BESCOM, BMTC, etc.
- Urgency: Low (0), Medium (1), High (2)

Usage:
    from api.services.classifier import classify_complaint

    result = await classify_complaint(text="Pothole on MG Road")
    # {'department': 'roads', 'authority': 'BBMP', 'urgency': 2, 'confidence': 0.92}
"""

from __future__ import annotations

import logging
import time
from typing import Any

from api.config import settings
from api.middleware.circuit_breaker import CircuitOpenError, get_circuit_breaker
from api.middleware.tracing import trace_operation
from api.services.metrics import (
    CLASSIFICATION_FALLBACK,
    record_classification,
)

logger = logging.getLogger("civicflow.classifier")

# ── Civic Complaint Classification Questions ──
# This defines the decision schema for Laya's typed decision engine

CIVIC_QUESTIONS = {
    "department": {
        "type": "choice",
        "instructions": "Which civic department should handle this complaint?",
        "criteria": {
            "roads": "potholes, road damage, footpaths, street lights, traffic signals, road markings, speed breakers, flyovers, bridges",
            "sanitation": "garbage collection, waste disposal, drains, sewage overflow, public toilets, street cleaning, mosquito control",
            "water": "water supply issues, leaking pipes, water contamination, low pressure, borewells, water tankers, waterlogging",
            "electricity": "power outages, faulty meters, street lights, electrical hazards, transformer issues, cable damage",
            "transport": "buses, metro, bus stops, railway crossings, auto rickshaws, taxi services, parking, traffic management",
            "housing": "building violations, unauthorized construction, tenant issues, property disputes, slum redevelopment",
            "planning": "zoning, land use, building permits, layout approvals, development projects, encroachment",
        },
    },
    "authority": {
        "type": "choice",
        "instructions": "Which Bengaluru civic authority is responsible for this issue?",
        "criteria": {
            "BBMP": "roads, sanitation, public health, parks, building permissions, property tax, general civic issues within BBMP limits",
            "BWSSB": "water supply, sewage, underground drainage, water connections, borewells",
            "BESCOM": "electricity supply, power distribution, street lighting, electrical safety",
            "BMTC": "bus services, bus stops, bus routes, metro feeder services",
            "BDA": "land development, layout formation, building approvals outside BBMP core",
            "GBA": "large-scale urban governance, coordination across civic agencies",
            "BMRDA": "regional planning, peripheral area development, infrastructure coordination",
            "KSDB": "slum development, rehabilitation, housing for economically weaker sections",
            "BEML": "heavy engineering, metro coach manufacturing, industrial equipment",
        },
    },
    "urgency": {
        "type": "score",
        "instructions": "How urgently does this civic issue need to be addressed?",
        "criteria": [
            "Low priority - minor inconvenience, aesthetic issue, non-urgent repair needed within weeks",
            "Medium priority - notable disruption affecting many people, should be addressed within days",
            "High priority - safety risk, health hazard, major infrastructure failure, requires immediate attention",
        ],
    },
    "safety_hazard": {
        "type": "noul",
        "instructions": "Does this complaint describe an immediate safety hazard or health risk to citizens?",
    },
    "requires_inspection": {
        "type": "noul",
        "instructions": "Does this complaint require an on-site inspection by officials before resolution?",
    },
}


# ── Classifier Instance (lazy initialization) ──
_classifier: Any = None  # Laya Router or Agent
_mode: str = "unknown"  # "sdk", "http", or "fallback"


async def _get_classifier():
    """Get or create the classifier instance."""
    global _classifier, _mode

    if _classifier is not None:
        return _classifier, _mode

    # ── Try SDK Mode First (Preferred) ──
    if settings.laya_classifier_enabled:
        try:
            from laya import Router

            # Use multilingual by default for Bengaluru (Kannada, Hindi, English, Tamil, Telugu)
            # Router auto-detects language and routes to appropriate checkpoint
            _classifier = Router(
                preload=False,  # Lazy load for faster startup
                max_loaded=2,  # Keep english + multilingual in memory
                default="multilingual",  # Default to multilingual for Indian context
            )
            _mode = "sdk"
            logger.info("✅ Laya SDK classifier initialized (Router mode, default=multilingual)")
            return _classifier, _mode

        except ImportError:
            logger.warning("Laya SDK not installed, falling back to HTTP mode")
        except Exception as exc:
            logger.error("Failed to initialize Laya SDK: %s", exc)

        # ── Try HTTP Mode ──
        if settings.laya_classifier_url:
            try:
                import httpx

                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"{settings.laya_classifier_url}/health")
                    if resp.status_code == 200:
                        _classifier = settings.laya_classifier_url
                        _mode = "http"
                        logger.info("✅ Laya HTTP classifier available at %s", settings.laya_classifier_url)
                        return _classifier, _mode
            except Exception as exc:
                logger.warning("Laya HTTP server not reachable: %s", exc)

    # ── Fallback to Rule-Based Classification ──
    logger.warning("⚠️ Using rule-based fallback classifier (no Laya available)")
    _classifier = None
    _mode = "fallback"
    return _classifier, _mode


async def classify_complaint(
    text: str,
    *,
    metadata: dict[str, Any] | None = None,
    channel: str = "api",
) -> dict[str, Any]:
    """Classify a civic complaint using the Laya decision engine.

    Args:
        text: The complaint text to classify
        metadata: Optional metadata (channel, user_id, location, etc.)
        channel: Channel name for metrics (api, telegram, discord, etc.)

    Returns:
        dict with keys:
            - department: str (roads, sanitation, water, electricity, transport, housing, planning)
            - authority: str (BBMP, BWSSB, BESCOM, etc.)
            - urgency: int (0=Low, 1=Medium, 2=High)
            - confidence: float (0.0 to 1.0)
            - safety_hazard: bool
            - requires_inspection: bool
            - reasoning: str (optional, when available)
            - model: str (which checkpoint was used)
    """
    start_time = time.perf_counter()
    classifier, mode = await _get_classifier()

    # Get circuit breaker for classifier
    circuit = get_circuit_breaker(
        "laya-classifier",
        failure_threshold=5,
        recovery_timeout=30.0,
    )

    # ── SDK Mode (Preferred) ──
    if mode == "sdk":
        try:
            # Use circuit breaker for SDK calls
            async def _sdk_classify():
                state = {"body": text}
                if metadata:
                    state["metadata"] = metadata

                # Add tracing for the SDK call
                with trace_operation("laya_sdk_predict", channel=channel, text_length=len(text)):
                    return classifier.predict(state, CIVIC_QUESTIONS)

            try:
                result = await circuit.call(_sdk_classify)
            except CircuitOpenError:
                # Circuit is open, use fallback
                CLASSIFICATION_FALLBACK.labels(reason="circuit_open").inc()
                duration = time.perf_counter() - start_time
                result = _fallback_classify(text)
                record_classification(
                    department=result["department"],
                    authority=result["authority"],
                    channel=channel,
                    duration=duration,
                    confidence=result["confidence"],
                )
                return result

            answers = result["answers"]

            # Extract department and authority choices
            dept_answer = answers.get("department", {})
            dept = dept_answer.get("choice", "roads")
            dept_conf = dept_answer.get("answer_confidence", dept_answer.get("confidence", 0.8))

            authority_answer = answers.get("authority", {})
            authority = authority_answer.get("choice", "BBMP")
            auth_conf = authority_answer.get("answer_confidence", authority_answer.get("confidence", 0.8))

            # Extract urgency score (0-2 range)
            urgency_answer = answers.get("urgency", {})
            urgency_raw = urgency_answer.get("score", 1.0)
            urgency = int(round(max(0, min(2, urgency_raw))))
            urgency_conf = urgency_answer.get("answer_confidence", urgency_answer.get("confidence", 0.7))

            # Noul questions (probability that statement is true)
            safety_prob = answers.get("safety_hazard", {}).get("noul", 0.0)
            inspection_prob = answers.get("requires_inspection", {}).get("noul", 0.0)

            # Use the minimum confidence across all predictions
            avg_confidence = (dept_conf + auth_conf + urgency_conf) / 3

            # Get routing info
            routing = result.get("routing", {})
            model_used = routing.get("model", "unknown")

            # Record metrics
            duration = time.perf_counter() - start_time
            record_classification(
                department=dept,
                authority=authority,
                channel=channel,
                duration=duration,
                confidence=avg_confidence,
            )

            logger.info(
                "Laya SDK classification: dept=%s auth=%s urgency=%d conf=%.2f model=%s",
                dept,
                authority,
                urgency,
                avg_confidence,
                model_used,
            )

            return {
                "department": dept,
                "authority": authority,
                "urgency": urgency,
                "confidence": round(avg_confidence, 3),
                "safety_hazard": safety_prob > 0.5,
                "safety_hazard_probability": round(safety_prob, 3),
                "requires_inspection": inspection_prob > 0.5,
                "requires_inspection_probability": round(inspection_prob, 3),
                "model": model_used,
                "mode": "sdk",
            }

        except Exception as exc:
            logger.error("Laya SDK classification failed: %s", exc)
            CLASSIFICATION_FALLBACK.labels(reason="sdk_error").inc()
            # Fall through to fallback

    # ── HTTP Mode ──
    elif mode == "http":
        try:
            import httpx

            async def _http_classify():
                # Add tracing for HTTP call
                with trace_operation("laya_http_classify", channel=channel, text_length=len(text)):
                    async with httpx.AsyncClient(timeout=settings.laya_classifier_timeout) as client:
                        response = await client.post(
                            f"{classifier}/v1/systemone",
                            json={
                                "state": {"body": text, "metadata": metadata or {}},
                                "questions": CIVIC_QUESTIONS,
                            },
                        )
                        response.raise_for_status()
                        return response.json()

            try:
                result = await circuit.call(_http_classify)
            except CircuitOpenError:
                # Circuit is open, use fallback
                CLASSIFICATION_FALLBACK.labels(reason="circuit_open").inc()
                duration = time.perf_counter() - start_time
                result = _fallback_classify(text)
                record_classification(
                    department=result["department"],
                    authority=result["authority"],
                    channel=channel,
                    duration=duration,
                    confidence=result["confidence"],
                )
                return result

            answers = result.get("answers", {})

            # Parse response (same format as SDK)
            dept = answers.get("department", {}).get("choice", "roads")
            authority = answers.get("authority", {}).get("choice", "BBMP")
            urgency_raw = answers.get("urgency", {}).get("score", 1.0)
            urgency = int(round(max(0, min(2, urgency_raw))))

            # Calculate confidence
            dept_conf = answers.get("department", {}).get("answer_confidence", 0.8)
            auth_conf = answers.get("authority", {}).get("answer_confidence", 0.8)
            urg_conf = answers.get("urgency", {}).get("answer_confidence", 0.7)
            avg_conf = (dept_conf + auth_conf + urg_conf) / 3

            safety_prob = answers.get("safety_hazard", {}).get("noul", 0.0)
            inspection_prob = answers.get("requires_inspection", {}).get("noul", 0.0)

            model_used = result.get("routing", {}).get("model", "http")

            # Record metrics
            duration = time.perf_counter() - start_time
            record_classification(
                department=dept,
                authority=authority,
                channel=channel,
                duration=duration,
                confidence=avg_conf,
            )

            logger.info(
                "Laya HTTP classification: dept=%s auth=%s urgency=%d conf=%.2f",
                dept,
                authority,
                urgency,
                avg_conf,
            )

            return {
                "department": dept,
                "authority": authority,
                "urgency": urgency,
                "confidence": round(avg_conf, 3),
                "safety_hazard": safety_prob > 0.5,
                "safety_hazard_probability": round(safety_prob, 3),
                "requires_inspection": inspection_prob > 0.5,
                "requires_inspection_probability": round(inspection_prob, 3),
                "model": model_used,
                "mode": "http",
            }

        except Exception as exc:
            logger.error("Laya HTTP classification failed: %s", exc)
            CLASSIFICATION_FALLBACK.labels(reason="http_error").inc()
            # Fall through to fallback

    # ── Rule-Based Fallback ──
    duration = time.perf_counter() - start_time
    result = _fallback_classify(text)
    record_classification(
        department=result["department"],
        authority=result["authority"],
        channel=channel,
        duration=duration,
        confidence=result["confidence"],
    )
    return result


def _fallback_classify(text: str) -> dict[str, Any]:
    """Rule-based classification fallback when Laya is unavailable.

    Uses keyword matching for basic classification. This is intentionally
    simple and should only be used as a last resort.
    """
    CLASSIFICATION_FALLBACK.labels(reason="no_laya").inc()
    text_lower = text.lower()

    # Department keywords
    dept_keywords = {
        "roads": ["pothole", "road", "footpath", "street light", "traffic signal", "speed breaker", "flyover", "bridge", "potholes", "roadside"],
        "sanitation": ["garbage", "waste", "drain", "sewage", "toilet", "mosquito", "trash", "rubbish", "dumping", "cleaning"],
        "water": ["water", "pipe", "leak", "borewell", "tanker", "waterlogging", "supply", "contamination"],
        "electricity": ["power", "electricity", "meter", "transformer", "outage", "cable", "electric", "bescom", "electrical", "wire", "electrocution"],
        "transport": ["bus", "metro", "railway", "auto", "taxi", "parking", "traffic", "bmtc"],
        "housing": ["building", "construction", "tenant", "property", "slum", "illegal construction"],
        "planning": ["zoning", "land", "permit", "layout", "encroachment", "development"],
    }

    # Authority keywords
    auth_keywords = {
        "BBMP": ["road", "garbage", "drain", "park", "building", "property tax", "bbmp"],
        "BWSSB": ["water", "sewage", "pipe", "borewell", "bwssb"],
        "BESCOM": ["power", "electricity", "meter", "transformer", "bescom", "electrical", "wire", "electrocution"],
        "BMTC": ["bus", "bmtc"],
        "BDA": ["land", "layout", "bda"],
    }

    # Urgency keywords
    high_urgency_words = ["danger", "accident", "hazard", "emergency", "collapse", "fire", "flood", "dangerous", "immediate"]
    low_urgency_words = ["minor", "small", "aesthetic", "suggestion", "feedback"]

    # Score departments
    dept_scores = {}
    for dept, keywords in dept_keywords.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            dept_scores[dept] = score

    department = max(dept_scores.keys(), key=lambda k: dept_scores[k]) if dept_scores else "roads"

    # Score authorities
    auth_scores = {}
    for auth, keywords in auth_keywords.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            auth_scores[auth] = score

    # Default authority based on department
    dept_to_auth = {
        "roads": "BBMP",
        "sanitation": "BBMP",
        "water": "BWSSB",
        "electricity": "BESCOM",
        "transport": "BMTC",
        "housing": "BBMP",
        "planning": "BDA",
    }
    authority = max(auth_scores.keys(), key=lambda k: auth_scores[k]) if auth_scores else dept_to_auth.get(department, "BBMP")

    # Determine urgency
    if any(word in text_lower for word in high_urgency_words):
        urgency = 2
    elif any(word in text_lower for word in low_urgency_words):
        urgency = 0
    else:
        urgency = 1

    # Estimate confidence (lower for fallback)
    confidence = 0.65 if dept_scores else 0.5

    logger.info(
        "Fallback classification: dept=%s auth=%s urgency=%d conf=%.2f",
        department,
        authority,
        urgency,
        confidence,
    )

    return {
        "department": department,
        "authority": authority,
        "urgency": urgency,
        "confidence": confidence,
        "safety_hazard": urgency == 2,
        "safety_hazard_probability": 0.8 if urgency == 2 else 0.2,
        "requires_inspection": True,  # Default to requiring inspection
        "requires_inspection_probability": 0.7,
        "model": "fallback",
        "mode": "fallback",
    }


# ── Batch Classification Support ──
async def classify_complaint_batch(
    texts: list[str],
    *,
    metadata: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Classify multiple complaints in a single batch for efficiency.

    Uses Laya's predict_batch for shared forward passes when in SDK mode.

    Args:
        texts: List of complaint texts
        metadata: Optional list of metadata dicts (one per text)

    Returns:
        List of classification results (same format as classify_complaint)
    """
    classifier, mode = await _get_classifier()

    if mode != "sdk":
        # Fall back to individual classification
        results = []
        for i, text in enumerate(texts):
            meta = metadata[i] if metadata else None
            results.append(await classify_complaint(text, metadata=meta))
        return results

    # SDK mode with batch support
    try:
        # Build states
        states = []
        for i, text in enumerate(texts):
            state = {"body": text}
            if metadata and i < len(metadata):
                state["metadata"] = metadata[i]
            states.append(state)

        # Batch predict using Router
        results_raw = classifier.predict_batch(
            [{"state": s, "questions": CIVIC_QUESTIONS} for s in states],
            batch_size=32,  # Reasonable default
            sort_by_length=True,  # Group by length for efficiency
        )

        # Parse results
        results = []
        for result in results_raw:
            answers = result.get("answers", {})

            dept = answers.get("department", {}).get("choice", "roads")
            authority = answers.get("authority", {}).get("choice", "BBMP")
            urgency_raw = answers.get("urgency", {}).get("score", 1.0)
            urgency = int(round(max(0, min(2, urgency_raw))))

            dept_conf = answers.get("department", {}).get("answer_confidence", 0.8)
            auth_conf = answers.get("authority", {}).get("answer_confidence", 0.8)
            urg_conf = answers.get("urgency", {}).get("answer_confidence", 0.7)
            avg_conf = (dept_conf + auth_conf + urg_conf) / 3

            safety_prob = answers.get("safety_hazard", {}).get("noul", 0.0)
            inspection_prob = answers.get("requires_inspection", {}).get("noul", 0.0)

            results.append({
                "department": dept,
                "authority": authority,
                "urgency": urgency,
                "confidence": round(avg_conf, 3),
                "safety_hazard": safety_prob > 0.5,
                "safety_hazard_probability": round(safety_prob, 3),
                "requires_inspection": inspection_prob > 0.5,
                "requires_inspection_probability": round(inspection_prob, 3),
                "model": result.get("routing", {}).get("model", "unknown"),
                "mode": "sdk_batch",
            })

        return results

    except Exception as exc:
        logger.error("Batch classification failed: %s", exc)
        # Fall back to individual classification
        results = []
        for i, text in enumerate(texts):
            meta = metadata[i] if metadata else None
            results.append(await classify_complaint(text, metadata=meta))
        return results
