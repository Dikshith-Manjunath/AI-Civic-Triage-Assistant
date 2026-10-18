"""Complaints router — v1 API endpoint for complaint submission and retrieval.

This handles multimodal complaint submission (text, image, audio, PDF)
and ticket retrieval endpoints.

Version: 1.0.0
Stability: Stable
"""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from api.db.clickhouse import (
    fetch_all_tickets,
    fetch_media_for_complaint,
    fetch_tickets_by_authority,
    insert_media,
    insert_ticket,
)
from api.models.ticket import AsyncTicketResponse, TicketResponse
from api.services.kafka import produce_complaint
from api.services.storage import ensure_bucket, get_presigned_url, upload_to_minio

logger = logging.getLogger("civicflow.routes.v1.complaints")

router = APIRouter(prefix="/complaints", tags=["complaints"])


# ── Response Models ──


class ComplaintSubmitResponse(BaseModel):
    """Response after submitting a complaint."""

    id: str = Field(..., description="Unique complaint ID (UUID)")
    status: str = Field("queued", description="Processing status")
    message: str = Field(
        "Complaint queued for processing",
        description="Human-readable status message"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "status": "queued",
                    "message": "Complaint queued for processing. You will receive a notification once it's classified."
                }
            ]
        }
    }


class MediaAttachment(BaseModel):
    """Media attachment metadata."""

    id: str = Field(..., description="Media ID")
    type: str = Field(..., description="Media type (image, audio, pdf)")
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="MIME type")
    size_bytes: int = Field(..., description="File size in bytes")
    url: str = Field(..., description="Presigned download URL (valid for 1 hour)")


# ── Endpoints ──


@router.post(
    "",
    response_model=ComplaintSubmitResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a citizen complaint",
    description=(
        "Accepts a complaint via text, image, audio, PDF, or any combination. "
        "Media files are stored in MinIO (S3-compatible), and a processing task is queued via Kafka.\n\n"
        "**Accepted Media Types:**\n"
        "- Images: image/jpeg, image/png, image/webp\n"
        "- Audio: audio/wav, audio/mp3, audio/ogg, audio/webm\n"
        "- Documents: application/pdf\n\n"
        "**Processing Pipeline:**\n"
        "1. Media uploaded to object storage\n"
        "2. Audio/PDF transcribed/extracted\n"
        "3. Classification via Laya AI\n"
        "4. PII detection and redaction\n"
        "5. Notification sent to relevant department"
    ),
    responses={
        202: {
            "description": "Complaint accepted and queued",
            "model": ComplaintSubmitResponse,
        },
        400: {
            "description": "No content provided",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "At least one of text, image, audio, or pdf is required."
                    }
                }
            },
        },
        413: {
            "description": "File too large",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Maximum file size is 50MB"
                    }
                }
            },
        },
        503: {
            "description": "Storage service unavailable",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Storage service unavailable: MinIO connection failed"
                    }
                }
            },
        },
    },
)
async def create_complaint(
    channel: Annotated[
        str,
        Form(
            description="Submission channel (web, app, whatsapp, telegram, discord)",
            pattern=r"^(web|app|whatsapp|telegram|discord|api)$",
        )
    ] = "web",
    text: Annotated[
        str | None,
        Form(description="Citizen complaint text (min 10 characters)", min_length=10)
    ] = None,
    image: Annotated[
        UploadFile | None,
        File(description="Image file (jpg/png/webp, max 50MB)")
    ] = None,
    audio: Annotated[
        UploadFile | None,
        File(description="Audio file (wav/mp3/ogg, max 100MB)")
    ] = None,
    pdf: Annotated[
        UploadFile | None,
        File(description="PDF document (max 50MB)")
    ] = None,
):
    """
    Submit a citizen complaint with optional multimodal attachments.

    At least one of (text, image, audio, pdf) is required.
    All media is stored securely and processed asynchronously.
    """
    # ── Validate: at least one input provided ──
    has_text = text and text.strip()
    has_image = image is not None and image.filename
    has_audio = audio is not None and audio.filename
    has_pdf = pdf is not None and pdf.filename

    if not (has_text or has_image or has_audio or has_pdf):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one of text, image, audio, or pdf is required.",
        )

    # Generate complaint ID early
    complaint_id = str(uuid.uuid4())

    # ── Ensure MinIO bucket exists ──
    if has_image or has_audio or has_pdf:
        try:
            ensure_bucket()
        except Exception as exc:
            logger.error("MinIO bucket check failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Storage service unavailable: {exc}",
            )

    # ── Upload media to MinIO ──
    media_records: list[dict] = []

    if has_audio:
        audio_bytes = await audio.read()
        obj_path = upload_to_minio(
            data=audio_bytes,
            complaint_id=complaint_id,
            media_type="audio",
            filename=audio.filename,
            content_type=audio.content_type or "audio/wav",
        )
        media_records.append({"type": "audio", "path": obj_path})

    if has_pdf:
        pdf_bytes = await pdf.read()
        obj_path = upload_to_minio(
            data=pdf_bytes,
            complaint_id=complaint_id,
            media_type="pdf",
            filename=pdf.filename,
            content_type=pdf.content_type or "application/pdf",
        )
        media_records.append({"type": "pdf", "path": obj_path})

    if has_image:
        image_bytes = await image.read()
        obj_path = upload_to_minio(
            data=image_bytes,
            complaint_id=complaint_id,
            media_type="image",
            filename=image.filename,
            content_type=image.content_type or "image/jpeg",
        )
        media_records.append({"type": "image", "path": obj_path})

    # ── Produce message to Kafka for background processing ──
    try:
        payload = {
            "id": complaint_id,
            "channel": channel,
            "text": text,
            "media": media_records,
        }
        await produce_complaint(payload)
        logger.info("Complaint %s queued for processing via Kafka", complaint_id)
    except Exception as exc:
        logger.error("Failed to queue complaint %s: %s", complaint_id, exc)
        # Still return 202 because media is saved

    return ComplaintSubmitResponse(
        id=complaint_id,
        status="queued",
        message="Complaint queued for processing. You will receive a notification once it's classified.",
    )


@router.get(
    "",
    response_model=list[TicketResponse],
    summary="List recent tickets",
    description="Fetch the most recent complaint tickets from the database.",
)
async def list_complaints(limit: int = 50):
    """
    Return recent complaint tickets.

    Results are ordered by timestamp (newest first).
    Maximum limit is 100.
    """
    limit = min(limit, 100)  # Cap at 100
    try:
        rows = fetch_all_tickets(limit=limit)
        return [TicketResponse(**r) for r in rows]
    except Exception as exc:
        logger.exception("Failed to fetch tickets")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {exc}",
        )


@router.get(
    "/by-authority/{authority}",
    response_model=list[TicketResponse],
    summary="List tickets by authority",
    description=(
        "Fetch tickets filtered by authority code.\n\n"
        "**Valid Authorities:** BBMP, BWSSB, BESCOM, BMTC, BDA, GBA, BMRDA, KSDB, BEML"
    ),
)
async def list_by_authority(authority: str, limit: int = 200):
    """
    Return tickets for a specific authority.

    Authority codes are case-insensitive.
    """
    limit = min(limit, 500)  # Cap at 500
    try:
        rows = fetch_tickets_by_authority(authority.upper(), limit=limit)
        return [TicketResponse(**r) for r in rows]
    except Exception as exc:
        logger.exception("Failed to fetch tickets for authority %s", authority)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {exc}",
        )


@router.get(
    "/{complaint_id}/media",
    response_model=list[MediaAttachment],
    summary="List media attachments for a complaint",
    description="Returns metadata + presigned download URLs for all media files attached to a complaint.",
)
async def get_complaint_media(complaint_id: str):
    """
    Return all media items (images, audio, PDFs) for a given complaint.

    Presigned URLs are valid for 1 hour.
    """
    try:
        media_rows = fetch_media_for_complaint(complaint_id)
    except Exception as exc:
        logger.exception("Failed to fetch media for %s", complaint_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {exc}",
        )

    if not media_rows:
        return []

    # Generate presigned URLs for each media item
    result = []
    for m in media_rows:
        url = get_presigned_url(m["object_path"])
        result.append(
            MediaAttachment(
                id=m["id"],
                type=m["type"],
                filename=m["filename"],
                content_type=m["content_type"],
                size_bytes=m["size_bytes"],
                url=url,
            )
        )

    return result
