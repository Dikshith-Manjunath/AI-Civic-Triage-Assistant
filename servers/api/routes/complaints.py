"""Complaints router — POST /complaints endpoint (Phase 1 + Phase 2 multimodal)."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from api.db.clickhouse import fetch_all_tickets, insert_media, insert_ticket
from api.models.ticket import TicketResponse
from api.services.embeddings import generate_embedding
from api.services.preprocess import (
    caption_image,
    extract_pdf_text,
    transcribe_audio,
    unify_inputs_to_text,
)
from api.services.authority_router import route_authority
from api.services.notifier import send_approval_request
from api.services.storage import ensure_bucket, upload_to_minio
from api.services.ticket_agent import classify_complaint
from api.services.retrieval import find_similar_complaints

logger = logging.getLogger("civicflow.routes.complaints")

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a citizen complaint",
    description=(
        "Accepts a complaint via text, image, audio, PDF, or any combination. "
        "Media files are stored in MinIO, text is extracted/merged, and a ticket "
        "is generated via AI and stored in ClickHouse."
    ),
)
async def create_complaint(
    channel: Annotated[str, Form(description="Submission channel (web, app, whatsapp, etc.)")] = "web",
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

    logger.info(
        "Complaint received [channel=%s text=%s image=%s audio=%s pdf=%s]",
        channel, bool(has_text),
        image.filename if has_image else None,
        audio.filename if has_audio else None,
        pdf.filename if has_pdf else None,
    )

    # We'll need a complaint_id for media storage; generate early
    import uuid
    complaint_id = str(uuid.uuid4())

    # ── Ensure MinIO bucket exists (idempotent) ──
    if has_image or has_audio or has_pdf:
        try:
            ensure_bucket()
        except Exception as exc:
            logger.error("MinIO bucket check failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Storage service unavailable: {exc}",
            )

    # ── Process each media input ──
    audio_transcript: str | None = None
    pdf_text: str | None = None
    image_caption: str | None = None
    media_records: list[dict] = []

    if has_audio:
        audio_bytes = await audio.read()
        # Upload to MinIO
        try:
            obj_path = upload_to_minio(
                data=audio_bytes,
                complaint_id=complaint_id,
                media_type="audio",
                filename=audio.filename,
                content_type=audio.content_type or "audio/wav",
            )
            media_records.append({
                "type": "audio",
                "object_path": obj_path,
                "filename": audio.filename,
                "content_type": audio.content_type or "audio/wav",
                "size_bytes": len(audio_bytes),
            })
        except Exception as exc:
            logger.error("Audio upload to MinIO failed: %s", exc)

        # Transcribe
        audio_transcript = transcribe_audio(audio_bytes, filename=audio.filename)

    if has_pdf:
        pdf_bytes = await pdf.read()
        # Upload to MinIO
        try:
            obj_path = upload_to_minio(
                data=pdf_bytes,
                complaint_id=complaint_id,
                media_type="pdf",
                filename=pdf.filename,
                content_type=pdf.content_type or "application/pdf",
            )
            media_records.append({
                "type": "pdf",
                "object_path": obj_path,
                "filename": pdf.filename,
                "content_type": pdf.content_type or "application/pdf",
                "size_bytes": len(pdf_bytes),
            })
        except Exception as exc:
            logger.error("PDF upload to MinIO failed: %s", exc)

        # Extract text
        pdf_text = extract_pdf_text(pdf_bytes, filename=pdf.filename)

    if has_image:
        image_bytes = await image.read()
        # Upload to MinIO
        try:
            obj_path = upload_to_minio(
                data=image_bytes,
                complaint_id=complaint_id,
                media_type="image",
                filename=image.filename,
                content_type=image.content_type or "image/jpeg",
            )
            media_records.append({
                "type": "image",
                "object_path": obj_path,
                "filename": image.filename,
                "content_type": image.content_type or "image/jpeg",
                "size_bytes": len(image_bytes),
            })
        except Exception as exc:
            logger.error("Image upload to MinIO failed: %s", exc)

        # Caption (placeholder)
        image_caption = caption_image(image_bytes, filename=image.filename)

    # ── Merge all inputs into unified text ──
    try:
        merged_text = unify_inputs_to_text(
            text=text,
            audio_transcript=audio_transcript,
            pdf_text=pdf_text,
            image_caption=image_caption,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    # ── Generate embedding for the merged text ──
    try:
        embedding = generate_embedding(merged_text)
        logger.info("Generated embedding (%d dims) for complaint %s", len(embedding), complaint_id)
    except Exception as exc:
        logger.error("Embedding generation failed: %s", exc)
        embedding = None

    # ── Retrieve similar past complaints for LLM context ──
    similar: list[dict] = []
    if embedding:
        try:
            similar = find_similar_complaints(embedding, limit=5)
            if similar:
                logger.info("Found %d similar past complaints for context", len(similar))
        except Exception as exc:
            logger.error("Similarity search failed: %s", exc)

    # ── Classify via LLM (with historical context + SOP RAG) ──
    try:
        ticket = await classify_complaint(
            merged_text,
            similar_complaints=similar or None,
            complaint_embedding=embedding,
        )
    except ValueError as exc:
        logger.error("Classification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI classification failed: {exc}",
        )
    except Exception as exc:
        logger.exception("Unexpected error during classification")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM service error: {exc}",
        )

    # ── Phase 4: Hybrid authority routing (overrides LLM authority) ──
    try:
        llm_authority = ticket.authority
        routed_authority = await route_authority(
            dept=ticket.dept,
            complaint_text=merged_text,
            similar_complaints=similar or None,
        )
        if routed_authority != llm_authority:
            logger.info(
                "Authority overridden: LLM=%s → Router=%s",
                llm_authority, routed_authority,
            )
        ticket.authority = routed_authority
    except Exception as exc:
        logger.error("Authority routing failed, keeping LLM authority: %s", exc)

    # ── Insert ticket into ClickHouse (with embedding) ──
    try:
        row = insert_ticket(
            ticket, raw_text=merged_text, channel=channel,
            ticket_id=complaint_id, embedding=embedding,
        )
    except Exception as exc:
        logger.exception("ClickHouse insert failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database insert failed: {exc}",
        )

    # ── Insert media metadata into ClickHouse ──
    ticket_id = row["id"]
    for media in media_records:
        try:
            insert_media(
                complaint_id=ticket_id,
                media_type=media["type"],
                object_path=media["object_path"],
                filename=media["filename"],
                content_type=media["content_type"],
                size_bytes=media["size_bytes"],
            )
        except Exception as exc:
            logger.error("Failed to insert media metadata: %s", exc)
            # Non-fatal — ticket is already created

    logger.info(
        "Ticket created: %s [media_files=%d]", ticket_id, len(media_records),
    )

    # ── Phase 5: Send Discord notification for pending ticket ──
    try:
        await send_approval_request({**row, "channel": channel})
    except Exception as exc:
        logger.error("Discord notification failed: %s", exc)

    return TicketResponse(**row)


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
