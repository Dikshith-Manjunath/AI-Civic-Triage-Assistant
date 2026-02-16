"""POST /complaints - Multimodal complaint ingestion endpoint."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

import structlog
from fastapi import APIRouter, File, Form, UploadFile

from app.config import get_settings
from app.schemas import ComplaintSubmission, MediaType, TicketStatus
from app.services.kafka_producer import kafka_service
from app.services.minio_client import minio_service

router = APIRouter()
logger = structlog.get_logger()
settings = get_settings()


@router.post("/complaints", response_model=ComplaintSubmission, status_code=202)
async def submit_complaint(
    text: Optional[str] = Form(None, description="Text description of the complaint"),
    audio: Optional[UploadFile] = File(None, description="Audio recording (.wav, .mp3, .m4a)"),
    image: Optional[UploadFile] = File(None, description="Photo evidence (.jpg, .png)"),
    pdf: Optional[UploadFile] = File(None, description="Document attachment (.pdf)"),
    location: Optional[str] = Form(None, description="Address or location description"),
    channel: str = Form("web", description="Submission channel: web, whatsapp, phone, email"),
):
    """
    Accept multimodal citizen complaints and queue for AI triage.

    Supports any combination of text, audio, image, and PDF inputs.
    Files are stored in MinIO; a Kafka message triggers the LangGraph agent.
    """
    ticket_id = uuid.uuid4()
    log = logger.bind(ticket_id=str(ticket_id), channel=channel)
    log.info("Complaint received")

    media_paths: list[str] = []
    media_types: list[str] = []

    # ── Upload files to MinIO ─────────────────────────────────
    if audio and audio.filename:
        path = f"complaints/{ticket_id}/audio/{audio.filename}"
        content = await audio.read()
        minio_service.upload_bytes(path, content, audio.content_type or "audio/wav")
        media_paths.append(path)
        media_types.append(MediaType.AUDIO.value)
        log.info("Audio uploaded", path=path, size=len(content))

    if image and image.filename:
        path = f"complaints/{ticket_id}/image/{image.filename}"
        content = await image.read()
        minio_service.upload_bytes(path, content, image.content_type or "image/jpeg")
        media_paths.append(path)
        media_types.append(MediaType.IMAGE.value)
        log.info("Image uploaded", path=path, size=len(content))

    if pdf and pdf.filename:
        path = f"complaints/{ticket_id}/pdf/{pdf.filename}"
        content = await pdf.read()
        minio_service.upload_bytes(path, content, "application/pdf")
        media_paths.append(path)
        media_types.append(MediaType.PDF.value)
        log.info("PDF uploaded", path=path, size=len(content))

    if text:
        media_types.append(MediaType.TEXT.value)

    # ── Publish to Kafka for async processing ─────────────────
    event = {
        "ticket_id": str(ticket_id),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "text": text,
        "location": location,
        "channel": channel,
        "media_paths": media_paths,
        "media_types": media_types,
        "status": TicketStatus.PROCESSING.value,
    }

    await kafka_service.send(settings.kafka_topic_raw, event)
    log.info("Event published to Kafka", topic=settings.kafka_topic_raw)

    return ComplaintSubmission(
        ticket_id=ticket_id,
        status=TicketStatus.PROCESSING,
        message="Complaint received and queued for AI triage.",
    )
