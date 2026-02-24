"""Preprocessing module — extract text from audio, PDF, and image inputs."""

from __future__ import annotations

import io
import logging
import tempfile
from pathlib import Path

logger = logging.getLogger("civicflow.preprocess")


# ── Audio transcription (faster-whisper) ─────────────────────────────────────

def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav") -> str:
    """
    Transcribe audio bytes using faster-whisper (local).
    Falls back to a stub if faster-whisper is not installed.
    """
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        logger.warning("faster-whisper not installed — returning stub transcription")
        return "[Audio file uploaded — transcription unavailable (faster-whisper not installed)]"

    logger.info("Transcribing audio file: %s (%d bytes)", filename, len(audio_bytes))

    # Write to temp file — faster-whisper needs a file path
    suffix = Path(filename).suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        model = WhisperModel("small", device="cpu", compute_type="int8")
        segments, info = model.transcribe(tmp_path, beam_size=5)
        transcript = " ".join(seg.text.strip() for seg in segments)
        logger.info(
            "Transcription complete: language=%s  prob=%.2f  chars=%d",
            info.language, info.language_probability, len(transcript),
        )
        return transcript if transcript else "[Audio file uploaded — no speech detected]"
    except Exception as exc:
        logger.error("Audio transcription failed: %s", exc)
        return f"[Audio transcription failed: {exc}]"
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ── PDF text extraction ──────────────────────────────────────────────────────

def extract_pdf_text(pdf_bytes: bytes, filename: str = "document.pdf") -> str:
    """Extract text from a PDF using pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError:
        logger.warning("pypdf not installed — returning stub")
        return "[PDF file uploaded — text extraction unavailable (pypdf not installed)]"

    logger.info("Extracting text from PDF: %s (%d bytes)", filename, len(pdf_bytes))

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text: list[str] = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages_text.append(text.strip())
        full_text = "\n\n".join(pages_text)
        logger.info("PDF extraction complete: %d pages, %d chars", len(reader.pages), len(full_text))
        return full_text if full_text else "[PDF file uploaded — no extractable text found]"
    except Exception as exc:
        logger.error("PDF text extraction failed: %s", exc)
        return f"[PDF extraction failed: {exc}]"


# ── Image captioning (placeholder) ───────────────────────────────────────────

def caption_image(image_bytes: bytes, filename: str = "image.jpg") -> str:
    """
    Generate a description for an uploaded image.
    Phase 2 placeholder — returns a generic caption.
    Future: integrate a vision model for real captioning.
    """
    logger.info("Image received: %s (%d bytes) — using placeholder caption", filename, len(image_bytes))
    return "Citizen uploaded an image related to civic complaint"


# ── Unified text merger ──────────────────────────────────────────────────────

def unify_inputs_to_text(
    text: str | None = None,
    audio_transcript: str | None = None,
    pdf_text: str | None = None,
    image_caption: str | None = None,
) -> str:
    """
    Merge all available input sources into a single complaint text
    for the ticket agent to classify.
    """
    parts: list[str] = []

    if text and text.strip():
        parts.append(f"[Citizen Text]\n{text.strip()}")

    if audio_transcript and audio_transcript.strip():
        parts.append(f"[Audio Transcript]\n{audio_transcript.strip()}")

    if pdf_text and pdf_text.strip():
        parts.append(f"[PDF Document]\n{pdf_text.strip()}")

    if image_caption and image_caption.strip():
        parts.append(f"[Image Description]\n{image_caption.strip()}")

    if not parts:
        raise ValueError("No usable input provided — at least one of text, audio, pdf, or image is required")

    merged = "\n\n".join(parts)
    logger.info("Unified complaint text: %d chars from %d source(s)", len(merged), len(parts))
    return merged
