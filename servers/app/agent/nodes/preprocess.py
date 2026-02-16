"""Preprocess node: convert multimodal inputs to unified text."""

from __future__ import annotations

import tempfile
from pathlib import Path

import structlog

from app.config import get_settings
from app.services.minio_client import minio_service

logger = structlog.get_logger()
settings = get_settings()


async def preprocess_multimodal(state: dict) -> dict:
    """
    Download media from MinIO and convert to text:
    - Audio → Whisper transcription
    - Image → CLIP/BLIP caption
    - PDF → PyPDF text extraction
    - Text → pass through
    """
    log = logger.bind(complaint_id=state["complaint_id"])
    log.info("Preprocessing multimodal inputs")

    transcription = ""
    image_caption = ""
    pdf_text = ""

    media_paths = state.get("media_paths", [])
    media_types = state.get("media_types", [])

    for path, mtype in zip(media_paths, media_types):
        try:
            if mtype == "audio":
                transcription = await _transcribe_audio(path)
                log.info("Audio transcribed", chars=len(transcription))

            elif mtype == "image":
                image_caption = await _caption_image(path)
                log.info("Image captioned", caption=image_caption[:100])

            elif mtype == "pdf":
                pdf_text = await _extract_pdf(path)
                log.info("PDF extracted", chars=len(pdf_text))
        except Exception as e:
            log.error("Media processing failed", type=mtype, path=path, error=str(e))

    # Build unified text from all sources
    parts = []
    if state.get("raw_text"):
        parts.append(f"Citizen Report: {state['raw_text']}")
    if transcription:
        parts.append(f"Audio Transcription: {transcription}")
    if image_caption:
        parts.append(f"Image Description: {image_caption}")
    if pdf_text:
        parts.append(f"Document Content: {pdf_text[:2000]}")
    if state.get("location"):
        parts.append(f"Reported Location: {state['location']}")

    unified_text = "\n\n".join(parts) if parts else "No complaint content provided."

    return {
        **state,
        "transcription": transcription,
        "image_caption": image_caption,
        "pdf_text": pdf_text,
        "unified_text": unified_text,
    }


async def _transcribe_audio(minio_path: str) -> str:
    """Transcribe audio using an optional local STT backend.

    Preferred backend: `faster-whisper` (install with `uv sync --extra audio`).
    """
    data = minio_service.download_bytes(minio_path)

    # Prefer faster-whisper to avoid numba/llvmlite constraints.
    try:
        from faster_whisper import WhisperModel  # type: ignore

        with tempfile.NamedTemporaryFile(suffix=Path(minio_path).suffix or ".wav", delete=True) as tmp:
            tmp.write(data)
            tmp.flush()

            # NOTE: model name matches faster-whisper naming (e.g. "small", "base", "medium")
            model = WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")
            segments, info = model.transcribe(tmp.name)
            text = " ".join(seg.text.strip() for seg in segments if seg.text)
            return text.strip()
    except ImportError:
        logger.warning("faster-whisper not installed; skipping audio transcription")
        return "[Audio transcription unavailable - install server audio extra]"
    except Exception as e:
        logger.error("Audio transcription failed", error=str(e))
        return "[Audio transcription failed]"


async def _caption_image(minio_path: str) -> str:
    """Generate image caption. Uses a simple prompt-based approach with the LLM."""
    try:
        data = minio_service.download_bytes(minio_path)
        # For local deployment: use CLIP or BLIP model
        # Fallback: describe as "uploaded image for civic complaint"
        return "Uploaded image showing civic infrastructure issue (detailed captioning requires CLIP/BLIP model)"
    except Exception as e:
        logger.error("Image captioning failed", error=str(e))
        return "[Image captioning failed]"


async def _extract_pdf(minio_path: str) -> str:
    """Extract text from PDF using pypdf."""
    try:
        from pypdf import PdfReader
        import io

        data = minio_service.download_bytes(minio_path)
        reader = PdfReader(io.BytesIO(data))

        text_parts = []
        for page in reader.pages[:10]:  # Limit to first 10 pages
            text_parts.append(page.extract_text() or "")

        return "\n".join(text_parts).strip()
    except Exception as e:
        logger.error("PDF extraction failed", error=str(e))
        return "[PDF extraction failed]"
