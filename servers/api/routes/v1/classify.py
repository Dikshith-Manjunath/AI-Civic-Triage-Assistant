"""Classification router — v1 API endpoint for JSON-based complaint classification.

This provides a simpler JSON-based endpoint for complaint classification,
complementing the multipart/form-data complaints endpoint.

Version: 1.0.0
Stability: Stable
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from api.services.classifier import classify_complaint as run_classification
from api.services.pii_detector import process_complaint_for_storage

logger = logging.getLogger("civicflow.routes.v1.classify")

router = APIRouter(prefix="/classify", tags=["classification"])


# ── Request / Response Models ──


class ClassifyRequest(BaseModel):
    """Request body for classification."""

    text: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Complaint text to classify (10-10000 characters)",
    )
    channel: str = Field(
        "api",
        description="Submission channel (api, telegram, discord, whatsapp, web)",
        pattern=r"^(api|telegram|discord|whatsapp|web|app)$",
    )
    user_id: str | None = Field(
        None,
        description="Optional user identifier for tracking",
        max_length=100,
    )
    location: str | None = Field(
        None,
        description="Optional location context (e.g., 'MG Road, Bengaluru')",
        max_length=500,
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "Large pothole on MG Road near Trinity Metro station causing traffic jams during peak hours. Multiple accidents have occurred here recently.",
                    "channel": "api",
                    "user_id": "citizen_12345",
                    "location": "MG Road, Near Trinity Metro, Bengaluru 560001"
                },
                {
                    "text": "No water supply in Whitefield area for the past 3 days. Multiple complaints registered but no action taken.",
                    "channel": "whatsapp",
                    "location": "Whitefield, Bengaluru"
                },
                {
                    "text": "Street light not working on 5th Cross, JP Nagar. It's very dark at night and unsafe for pedestrians.",
                    "channel": "app",
                    "user_id": "user_jp_789"
                }
            ]
        }
    }


class ClassificationResult(BaseModel):
    """Classification result from the Laya decision engine."""

    department: str = Field(
        ...,
        description="Civic department responsible (roads, water, electricity, sanitation, transport, housing, planning)",
    )
    authority: str = Field(
        ...,
        description="Government authority responsible (BBMP, BWSSB, BESCOM, BMTC, BDA, GBA, BMRDA, KSDB, BEML)",
    )
    urgency: int = Field(
        ...,
        ge=0,
        le=2,
        description="Urgency level: 0=Low (weeks), 1=Medium (days), 2=High (immediate)",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Classification confidence score (0.0-1.0). Higher is better.",
    )
    safety_hazard: bool = Field(
        False,
        description="True if the complaint describes an immediate safety or health hazard",
    )
    requires_inspection: bool = Field(
        True,
        description="True if an on-site inspection is recommended before resolution",
    )
    model: str = Field(
        "fallback",
        description="Model/checkpoint used for classification (e.g., 'multilingual', 'english', 'fallback')",
    )
    mode: str = Field(
        "fallback",
        description="Classification mode: 'sdk' (local), 'http' (remote), or 'fallback' (rule-based)",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "department": "roads",
                    "authority": "BBMP",
                    "urgency": 2,
                    "confidence": 0.94,
                    "safety_hazard": True,
                    "requires_inspection": True,
                    "model": "multilingual",
                    "mode": "sdk"
                }
            ]
        }
    }


class PIIInfo(BaseModel):
    """PII detection information."""

    detected: bool = Field(..., description="Whether PII was detected in the text")
    types: list[str] = Field(
        default_factory=list,
        description="Types of PII detected (phone, email, aadhaar, etc.)",
    )
    redacted_text: str | None = Field(
        None,
        description="Text with PII redacted (only if PII was detected)",
    )


class ClassifyResponse(BaseModel):
    """Full response for classification endpoint."""

    classification: ClassificationResult = Field(
        ...,
        description="The classification result from the decision engine"
    )
    pii: PIIInfo = Field(
        ...,
        description="PII detection and redaction information"
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the request processing"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "classification": {
                        "department": "roads",
                        "authority": "BBMP",
                        "urgency": 2,
                        "confidence": 0.94,
                        "safety_hazard": True,
                        "requires_inspection": True,
                        "model": "multilingual",
                        "mode": "sdk"
                    },
                    "pii": {
                        "detected": True,
                        "types": ["phone"],
                        "redacted_text": "There's a pothole near my house. Call me at [PHONE_REDACTED] for details."
                    },
                    "metadata": {
                        "original_text_length": 120,
                        "processing_time_ms": 145.3,
                        "channel": "api"
                    }
                }
            ]
        }
    }


# ── Error Response Models ──


class ErrorDetail(BaseModel):
    """Error detail for API responses."""

    code: str = Field(..., description="Error code for programmatic handling")
    message: str = Field(..., description="Human-readable error message")
    field: str | None = Field(None, description="Field that caused the error (if applicable)")
    suggestion: str | None = Field(None, description="Suggested fix or next step")


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error: ErrorDetail = Field(..., description="Error details")
    request_id: str | None = Field(None, description="Request ID for support reference")
    documentation_url: str | None = Field(
        None,
        description="Link to relevant documentation"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Text must be between 10 and 10000 characters",
                        "field": "text",
                        "suggestion": "Provide a complaint description of at least 10 characters"
                    },
                    "request_id": "abc123def456",
                    "documentation_url": "https://docs.civicflow.in/api/v1/classify"
                }
            ]
        }
    }


# ── Endpoints ──


@router.post(
    "",
    response_model=ClassifyResponse,
    summary="Classify a civic complaint",
    description=(
        "Analyze complaint text and return department, authority, urgency, and other metadata. "
        "Automatically detects and redacts PII (phone numbers, emails, Aadhaar numbers, etc.).\n\n"
        "**Classification Process:**\n"
        "1. PII detection and redaction\n"
        "2. Text analysis via Laya decision engine (or fallback rules)\n"
        "3. Department and authority assignment\n"
        "4. Urgency scoring (0-2)\n"
        "5. Safety hazard and inspection assessment\n\n"
        "**Departments:** roads, sanitation, water, electricity, transport, housing, planning\n\n"
        "**Authorities:** BBMP, BWSSB, BESCOM, BMTC, BDA, GBA, BMRDA, KSDB, BEML"
    ),
    responses={
        200: {
            "description": "Classification successful",
            "model": ClassifyResponse,
        },
        400: {
            "description": "Validation error",
            "model": ErrorResponse,
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "message": "Invalid channel value",
                            "field": "channel"
                        }
                    }
                }
            },
        },
        422: {
            "description": "Request body validation failed",
            "model": ErrorResponse,
        },
        500: {
            "description": "Classification service error",
            "model": ErrorResponse,
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "CLASSIFICATION_ERROR",
                            "message": "Classification service temporarily unavailable",
                            "suggestion": "Retry the request or use fallback classifier"
                        }
                    }
                }
            },
        },
    },
)
async def classify_complaint(request: ClassifyRequest):
    """
    Classify a civic complaint.

    This endpoint:
    1. Detects and redacts PII (personally identifiable information)
    2. Classifies the complaint using Laya AI (or fallback rules)
    3. Returns department, authority, urgency, and confidence scores

    **Rate Limiting:** 60 requests/minute, 1000 requests/hour
    """
    import time

    start_time = time.perf_counter()

    # ── PII Detection & Processing ──
    pii_result = process_complaint_for_storage(request.text)

    # Use redacted text for classification if PII detected
    text_for_classification = pii_result["redacted_text"] if pii_result["has_pii"] else request.text

    # ── Build metadata ──
    metadata: dict[str, Any] = {
        "channel": request.channel,
        "original_text_length": len(request.text),
    }
    if request.user_id:
        metadata["user_id"] = request.user_id
    if request.location:
        metadata["location"] = request.location

    # ── Run Classification ──
    try:
        classification = await run_classification(
            text=text_for_classification,
            metadata=metadata,
            channel=request.channel,
        )
    except Exception as exc:
        logger.error("Classification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "CLASSIFICATION_ERROR",
                "message": f"Classification service error: {exc}",
                "suggestion": "The classification service may be temporarily unavailable. Please retry.",
            },
        )

    # ── Build Response ──
    processing_time_ms = (time.perf_counter() - start_time) * 1000

    return ClassifyResponse(
        classification=ClassificationResult(
            department=classification["department"],
            authority=classification["authority"],
            urgency=classification["urgency"],
            confidence=classification["confidence"],
            safety_hazard=classification.get("safety_hazard", False),
            requires_inspection=classification.get("requires_inspection", True),
            model=classification.get("model", "unknown"),
            mode=classification.get("mode", "unknown"),
        ),
        pii=PIIInfo(
            detected=pii_result["has_pii"],
            types=pii_result["pii_types"],
            redacted_text=pii_result["redacted_text"] if pii_result["has_pii"] else None,
        ),
        metadata={
            "original_text_length": len(request.text),
            "processing_time_ms": round(processing_time_ms, 2),
            "channel": request.channel,
        },
    )


@router.post(
    "/batch",
    response_model=list[ClassifyResponse],
    summary="Classify multiple complaints",
    description=(
        "Batch classification for multiple complaints. More efficient than individual calls "
        "when classifying multiple complaints at once.\n\n"
        "**Limits:** Maximum 50 complaints per batch request."
    ),
    responses={
        200: {
            "description": "Batch classification successful",
            "model": list[ClassifyResponse],
        },
        400: {
            "description": "Batch size limit exceeded",
            "model": ErrorResponse,
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "BATCH_LIMIT_EXCEEDED",
                            "message": "Maximum 50 complaints per batch",
                            "suggestion": "Split your batch into smaller requests"
                        }
                    }
                }
            },
        },
    },
)
async def classify_batch(requests: list[ClassifyRequest]):
    """
    Classify multiple complaints in a batch.

    Processes up to 50 complaints in a single request for improved efficiency.
    """
    if len(requests) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "BATCH_LIMIT_EXCEEDED",
                "message": "Maximum 50 complaints per batch",
                "suggestion": "Split your batch into multiple requests of 50 or fewer complaints",
            },
        )

    results = []
    for req in requests:
        result = await classify_complaint(req)
        results.append(result)

    return results
