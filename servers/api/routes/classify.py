"""Classification router — Direct classification endpoint for JSON API.

This provides a simpler JSON-based endpoint for complaint classification,
complementing the multipart/form-data complaints endpoint.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from api.services.classifier import classify_complaint as run_classification
from api.services.pii_detector import process_complaint_for_storage

logger = logging.getLogger("civicflow.routes.classify")

router = APIRouter(prefix="/classify", tags=["classification"])


# ── Request / Response Models ──


class ClassifyRequest(BaseModel):
    """Request body for classification."""

    text: str = Field(..., min_length=10, description="Complaint text to classify")
    channel: str = Field("api", description="Submission channel (api, telegram, discord, etc.)")
    user_id: str | None = Field(None, description="Optional user identifier")
    location: str | None = Field(None, description="Optional location context")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "Large pothole on MG Road near Trinity Metro station causing traffic jams",
                    "channel": "api",
                    "user_id": "citizen_123",
                    "location": "MG Road, Bengaluru"
                }
            ]
        }
    }


class ClassificationResult(BaseModel):
    """Classification result."""

    department: str = Field(..., description="Civic department (roads, water, etc.)")
    authority: str = Field(..., description="Responsible authority (BBMP, BWSSB, etc.)")
    urgency: int = Field(..., ge=0, le=2, description="Urgency level (0=Low, 1=Medium, 2=High)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence")
    safety_hazard: bool = Field(False, description="Whether this describes a safety hazard")
    requires_inspection: bool = Field(True, description="Whether on-site inspection is needed")
    model: str = Field("fallback", description="Model used for classification")
    mode: str = Field("fallback", description="Classification mode (sdk, http, fallback)")


class ClassifyResponse(BaseModel):
    """Full response for classification endpoint."""

    classification: ClassificationResult
    pii_detected: bool = Field(False, description="Whether PII was detected in text")
    pii_types: list[str] = Field(default_factory=list, description="Types of PII detected")
    redacted_text: str | None = Field(None, description="PII-redacted version of text")
    original_text_length: int = Field(..., description="Length of original text")


# ── Endpoints ──


@router.post(
    "",
    response_model=ClassifyResponse,
    summary="Classify a civic complaint",
    description=(
        "Analyze complaint text and return department, authority, urgency, and other metadata. "
        "Also detects and handles PII (phone numbers, emails, Aadhaar, etc.)."
    ),
)
async def classify_complaint(request: ClassifyRequest):
    """
    Classify a civic complaint.

    This endpoint:
    1. Detects and redacts PII (personally identifiable information)
    2. Classifies the complaint using Laya (or fallback rules)
    3. Returns department, authority, urgency, and confidence
    """
    # ── PII Detection & Processing ──
    pii_result = process_complaint_for_storage(request.text)

    # Use redacted text for classification if PII detected
    text_for_classification = pii_result["redacted_text"] if pii_result["has_pii"] else request.text

    # ── Build metadata ──
    metadata: dict[str, Any] = {
        "channel": request.channel,
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
            detail=f"Classification failed: {exc}",
        )

    # ── Build Response ──
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
        pii_detected=pii_result["has_pii"],
        pii_types=pii_result["pii_types"],
        redacted_text=pii_result["redacted_text"] if pii_result["has_pii"] else None,
        original_text_length=len(request.text),
    )


@router.post(
    "/batch",
    response_model=list[ClassifyResponse],
    summary="Classify multiple complaints",
    description="Batch classification for multiple complaints. More efficient than individual calls.",
)
async def classify_batch(requests: list[ClassifyRequest]):
    """
    Classify multiple complaints in a batch.

    Limited to 50 complaints per batch for performance.
    """
    if len(requests) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 50 complaints per batch",
        )

    results = []
    for req in requests:
        result = await classify_complaint(req)
        results.append(result)

    return results
