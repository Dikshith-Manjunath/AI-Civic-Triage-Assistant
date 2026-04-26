"""Complaints router — POST /complaints endpoint (Phase 1 + Phase 2 multimodal)."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

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

logger = logging.getLogger("civicflow.routes.complaints")

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post(
    "",
    response_model=AsyncTicketResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a citizen complaint (Async)",
    description=(
        "Accepts a complaint via text, image, audio, PDF, or any combination. "
        "Media files are stored in MinIO, and a processing task is queued via Kafka."
    ),
)
async def create_complaint(
    channel: Annotated[
        str, Form(description="Submission channel (web, app, whatsapp, etc.)")
    ] = "web",
    text: Annotated[str | None, Form(description="Citizen complaint text")] = None,
    image: Annotated[UploadFile | None, File(description="Image file (jpg/png)")] = None,
    audio: Annotated[UploadFile | None, File(description="Audio file (wav/mp3/ogg)")] = None,
    pdf: Annotated[UploadFile | None, File(description="PDF document")] = None,
):
    """
    Accept a citizen complaint with optional multimodal attachments.
    At least one of (text, image, audio, pdf) is required.
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
    import uuid
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

    # ── Upload media to MinIO (non-blocking transcription/captioning) ──
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
        # We still return 202 because media is saved, but this is a critical degradation
        # In production, you'd want to handle this more robustly.

    return AsyncTicketResponse(id=complaint_id)


@router.get(
    "",
    response_model=list[TicketResponse],
    summary="List recent tickets",
    description="Fetch the most recent complaint tickets from ClickHouse.",
)
async def list_complaints(limit: int = 50):
    """Return recent complaint tickets."""
    try:
        rows = fetch_all_tickets(limit=limit)
        return [TicketResponse(**r) for r in rows]
    except Exception as exc:
        logger.exception("Failed to fetch tickets")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {exc}",
        )


# ── Department-to-authority mapping ──
_DEPT_TO_AUTHORITY: dict[str, str] = {
    "bbmp": "BBMP",
    "bwssb": "BWSSB",
    "bescom": "BESCOM",
    "bmtc": "BMTC",
    "bda": "BDA",
    "gba": "GBA",
    "roads": "BBMP",
    "sanitation": "BBMP",
    "water": "BWSSB",
    "electricity": "BESCOM",
    "transport": "BMTC",
    "planning": "BDA",
    "housing": "KSDB",
}


@router.get(
    "/by-authority/{authority}",
    response_model=list[TicketResponse],
    summary="List tickets by authority",
    description="Fetch tickets filtered by authority code (e.g. BBMP, BWSSB).",
)
async def list_by_authority(authority: str, limit: int = 200):
    """Return tickets for a specific authority."""
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
    "/by-dept/{dept}",
    response_model=list[TicketResponse],
    summary="List tickets by department slug",
    description="Fetch tickets by client department slug (bbmp, bwssb, etc.).",
)
async def list_by_dept(dept: str, limit: int = 200):
    """Return tickets for a department slug, mapped to its authority code."""
    authority = _DEPT_TO_AUTHORITY.get(dept.lower())
    if not authority:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown department: {dept}. Valid: {list(_DEPT_TO_AUTHORITY.keys())}",
        )
    try:
        rows = fetch_tickets_by_authority(authority, limit=limit)
        return [TicketResponse(**r) for r in rows]
    except Exception as exc:
        logger.exception("Failed to fetch tickets for dept %s", dept)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {exc}",
        )


# ── Media endpoint ───────────────────────────────────────────────────────
@router.get(
    "/{complaint_id}/media",
    summary="List media attachments for a complaint",
    description="Returns metadata + presigned download URLs for all media files attached to a complaint.",
)
async def get_complaint_media(complaint_id: str):
    """Return all media items (images, audio, PDFs) for a given complaint."""
    try:
        media_rows = fetch_media_for_complaint(complaint_id)
    except Exception as exc:
        logger.exception("Failed to fetch media for %s", complaint_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {exc}",
        )

    # Generate presigned URLs for each media item
    result = []
    for m in media_rows:
        url = get_presigned_url(m["object_path"])
        result.append(
            {
                "id": m["id"],
                "type": m["type"],
                "filename": m["filename"],
                "content_type": m["content_type"],
                "size_bytes": m["size_bytes"],
                "url": url,
            }
        )

    return result
