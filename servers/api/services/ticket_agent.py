"""Ticket Agent — orchestrates classification of citizen complaints using Laya classifier."""

from __future__ import annotations

import json
import logging
import re

from api.config import settings
from api.models.ticket import VALID_AUTHORITIES, VALID_DEPARTMENTS, TicketClassification
from api.services.sop_retrieval import retrieve_relevant_sops

logger = logging.getLogger("civicflow.agent")

# Import Laya classifier client (preferred) or fall back to Gemini
if settings.laya_classifier_enabled:
    from api.services.classifier import classify_complaint as classify_with_laya
    logger.info("Using Laya classifier for complaint classification")
else:
    from api.services.nim_client import chat_completion
    logger.info("Using Gemini LLM for complaint classification (Laya disabled)")

# ── LLM System Prompt (for Gemini fallback) ──
SYSTEM_PROMPT = """\
You are CivicFlow, an AI civic-issue triage assistant for Bengaluru, India.

Given a citizen complaint, you MUST return a JSON object with EXACTLY these fields:
{
  "dept": "<department>",
  "authority": "<authority_code>",
  "urgency": <0|1|2>,
  "summary": "<concise structured description>",
  "reply": "<citizen-facing acknowledgement>"
}

DEPARTMENTS (choose one):
  roads, sanitation, water, electricity, transport, housing, planning

AUTHORITY CODES (choose one):
  BBMP   — Bruhat Bengaluru Mahanagara Palike (roads, sanitation, general civic)
  GBA    — Greater Bengaluru Authority (large-scale urban governance)
  BWSSB  — Bangalore Water Supply & Sewerage Board (water, sewage)
  BESCOM — Bangalore Electricity Supply Company (electricity, power)
  BMTC   — Bengaluru Metropolitan Transport Corporation (public buses, transport)
  BEML   — BEML Limited (heavy engineering, metro equipment)
  BDA    — Bangalore Development Authority (land, layouts, planning)
  BMRDA  — Bangalore Metropolitan Region Development Authority (regional planning)
  KSDB   — Karnataka Slum Development Board (slum housing, rehabilitation)

URGENCY:
  0 = Low   (minor inconvenience, non-urgent)
  1 = Medium (notable disruption, should be addressed soon)
  2 = High  (safety risk, major outage, health hazard)

RULES:
- Output ONLY valid JSON. No markdown, no explanation, no extra text.
- Choose the MOST appropriate department and authority for the complaint.
- The "summary" should be 1-2 sentences capturing the core issue.
- The "reply" should be a polite acknowledgement telling the citizen their complaint is received.
- If municipal guidelines/SOPs are provided, use them to ground your response.
  Reference relevant policies when applicable but do NOT hallucinate policy details.
"""


def _extract_json(text: str) -> dict:
    """Extract the first JSON object from LLM output, handling markdown fences."""
    # Strip markdown code fences if present
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1).strip()

    # Find first { ... } block
    start = text.find("{")
    if start == -1:
        raise ValueError(f"No JSON object found in LLM output: {text[:200]}")

    end = text.rfind("}")
    if end == -1 or end <= start:
        # LLM may have returned truncated JSON — try to repair by adding closing brace
        logger.warning("JSON appears truncated, attempting repair")
        text = text[start:] + "}"
        # Try adding missing quotes if needed
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try more aggressive repair — add closing quote + brace
            text = text.rstrip() + '"}'
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                raise ValueError(f"Truncated/invalid JSON from LLM: {text[:200]}")

    return json.loads(text[start : end + 1])


def _build_context_block(similar_complaints: list[dict] | None) -> str:
    """Build a context block from similar past complaints for the LLM."""
    if not similar_complaints:
        return ""

    lines = ["\n--- Related past complaints (for context) ---"]
    for i, c in enumerate(similar_complaints, 1):
        lines.append(
            f"{i}. [{c['dept'].upper()}/{c['authority']}] (urgency={c['urgency']}) {c['summary']}"
        )
    lines.append("--- End of related complaints ---\n")
    return "\n".join(lines)


def _build_sop_context(sop_chunks: list[dict]) -> str:
    """Build a context block from retrieved SOP document chunks."""
    if not sop_chunks:
        return ""

    lines = ["\n--- Relevant Municipal Guidelines / SOPs ---"]
    for i, chunk in enumerate(sop_chunks, 1):
        lines.append(f"{i}. [{chunk['source']}] (relevance={chunk['score']:.2f})")
        lines.append(f"   {chunk['chunk_text'][:800]}")
    lines.append("--- End of guidelines ---\n")
    return "\n".join(lines)


async def classify_complaint(
    complaint_text: str,
    similar_complaints: list[dict] | None = None,
    complaint_embedding: list[float] | None = None,
) -> TicketClassification:
    """Classify a complaint using Laya classifier (preferred) or Gemini LLM fallback.

    Args:
        complaint_text: Unified text from citizen input.
        similar_complaints: Optional list of similar past complaints for context.
        complaint_embedding: Optional pre-computed embedding for SOP retrieval.
    """
    logger.info("Classifying complaint (%d chars)", len(complaint_text))

    # ── Use Laya Classifier (Preferred Path) ──
    if settings.laya_classifier_enabled:
        try:
            result = await classify_with_laya(text=complaint_text)

            # Build classification from Laya response
            ticket = TicketClassification(
                dept=result["department"],
                authority=result["authority"],
                urgency=result["urgency"],
                confidence=result.get("confidence", 0.8),
                summary=_generate_summary(complaint_text, result["department"]),
                reply=_generate_acknowledgement(result["department"], result["authority"]),
            )

            logger.info(
                "Laya classification: dept=%s authority=%s urgency=%d conf=%.2f",
                ticket.dept,
                ticket.authority,
                ticket.urgency,
                result.get("confidence", 0.0),
            )
            return ticket

        except Exception as exc:
            logger.error("Laya classifier failed: %s — falling back to LLM", exc)
            # Fall through to LLM fallback

    # ── LLM Fallback (Gemini) ──
    # Retrieve SOP context for RAG
    sop_chunks: list[dict] = []
    if complaint_embedding:
        try:
            sop_chunks = retrieve_relevant_sops(complaint_embedding, limit=5)
            if sop_chunks:
                logger.info("Retrieved %d SOP chunks for RAG context", len(sop_chunks))
        except Exception as exc:
            logger.warning("SOP retrieval failed (non-fatal): %s", exc)

    # Enrich user message with historical context
    context_block = _build_context_block(similar_complaints)
    sop_block = _build_sop_context(sop_chunks)
    enriched_message = f"{sop_block}{context_block}{complaint_text}"

    if context_block:
        logger.info(
            "Enriched LLM prompt with %d similar complaints",
            len(similar_complaints or []),
        )

    raw_response = await chat_completion(
        system_prompt=SYSTEM_PROMPT,
        user_message=enriched_message,
    )

    # Parse and validate
    try:
        parsed = _extract_json(raw_response)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse LLM JSON: %s — raw: %s", exc, raw_response[:300])
        raise ValueError(f"LLM returned invalid JSON: {exc}") from exc

    # Normalise fields
    parsed["dept"] = parsed.get("dept", "").lower().strip()
    parsed["authority"] = parsed.get("authority", "").upper().strip()

    # Validate authority
    if parsed["authority"] not in VALID_AUTHORITIES:
        logger.warning("Unknown authority '%s', defaulting to BBMP", parsed["authority"])
        parsed["authority"] = "BBMP"

    # Validate department
    if parsed["dept"] not in VALID_DEPARTMENTS:
        logger.warning("Unknown dept '%s', keeping as-is", parsed["dept"])

    # Clamp urgency
    parsed["urgency"] = max(0, min(2, int(parsed.get("urgency", 1))))

    # Set default confidence for LLM results
    if "confidence" not in parsed:
        parsed["confidence"] = 0.75

    ticket = TicketClassification(**parsed)
    logger.info(
        "LLM classification result: dept=%s authority=%s urgency=%d",
        ticket.dept,
        ticket.authority,
        ticket.urgency,
    )
    return ticket


def _generate_summary(text: str, department: str) -> str:
    """Generate a brief summary from complaint text."""
    # Truncate and clean for summary
    clean_text = text.strip().replace("\n", " ")
    if len(clean_text) > 150:
        return clean_text[:147] + "..."
    return clean_text or f"Civic complaint related to {department}"


def _generate_acknowledgement(department: str, authority: str) -> str:
    """Generate a citizen-facing acknowledgement message."""
    dept_names = {
        "roads": "Roads & Infrastructure",
        "water": "Water Supply",
        "sanitation": "Sanitation & Waste Management",
        "electricity": "Electricity",
        "transport": "Public Transport",
        "housing": "Housing",
        "planning": "Urban Planning",
    }

    dept_display = dept_names.get(department, department.title())

    return (
        f"Thank you for your complaint regarding {dept_display}. "
        f"Your ticket has been assigned to {authority} and will be reviewed shortly. "
        f"You will receive updates on the status of your complaint."
    )
