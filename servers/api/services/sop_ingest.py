"""SOP Document Ingestion — load PDFs, chunk, embed, and store in ClickHouse."""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from pypdf import PdfReader

from api.db.clickhouse import get_client
from api.services.embeddings import generate_embedding

logger = logging.getLogger("civicflow.sop_ingest")

# ── Chunking parameters ──
CHUNK_SIZE = 600       # target tokens (~chars / 4, but we use chars as proxy)
CHUNK_CHARS = 2400     # ~600 tokens × 4 chars/token
OVERLAP_CHARS = 400    # ~100 tokens overlap

SOP_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "sops"


def _extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract all text from a PDF file using pypdf."""
    reader = PdfReader(str(pdf_path))
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    full_text = "\n\n".join(pages)
    logger.debug("Extracted %d chars from %s (%d pages)", len(full_text), pdf_path.name, len(reader.pages))
    return full_text


def _chunk_text(text: str, chunk_size: int = CHUNK_CHARS, overlap: int = OVERLAP_CHARS) -> list[str]:
    """Split text into overlapping chunks.

    Args:
        text: Full document text.
        chunk_size: Max characters per chunk (~500-800 tokens).
        overlap: Characters of overlap between consecutive chunks.

    Returns:
        List of text chunks.
    """
    if len(text) <= chunk_size:
        return [text.strip()] if text.strip() else []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size

        # Try to break at a paragraph or sentence boundary
        if end < len(text):
            # Look for paragraph break first
            para_break = text.rfind("\n\n", start + chunk_size // 2, end)
            if para_break != -1:
                end = para_break
            else:
                # Fall back to sentence boundary
                sent_break = text.rfind(". ", start + chunk_size // 2, end)
                if sent_break != -1:
                    end = sent_break + 1  # include the period

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Move forward with overlap
        start = end - overlap if end < len(text) else len(text)

    logger.debug("Chunked text (%d chars) → %d chunks", len(text), len(chunks))
    return chunks


def _already_ingested(source: str) -> bool:
    """Check if a source PDF has already been ingested into ClickHouse."""
    client = get_client()
    result = client.query(
        "SELECT count() FROM sop_documents WHERE source = %(src)s",
        parameters={"src": source},
    )
    count = result.result_rows[0][0] if result.result_rows else 0
    return count > 0


def ingest_pdf(pdf_path: Path) -> int:
    """Ingest a single PDF: extract → chunk → embed → store.

    Args:
        pdf_path: Path to the PDF file.

    Returns:
        Number of chunks inserted.
    """
    source = pdf_path.name

    if _already_ingested(source):
        logger.info("SOP '%s' already ingested — skipping", source)
        return 0

    logger.info("Ingesting SOP: %s", source)

    # Extract text
    full_text = _extract_text_from_pdf(pdf_path)
    if not full_text.strip():
        logger.warning("SOP '%s' has no extractable text — skipping", source)
        return 0

    # Chunk
    chunks = _chunk_text(full_text)
    if not chunks:
        logger.warning("SOP '%s' produced no chunks — skipping", source)
        return 0

    logger.info("SOP '%s' → %d chunks, generating embeddings...", source, len(chunks))

    # Embed and prepare rows
    client = get_client()
    rows: list[list] = []
    for chunk in chunks:
        embedding = generate_embedding(chunk)
        rows.append([
            str(uuid.uuid4()),
            source,
            chunk,
            embedding,
        ])

    # Bulk insert
    client.insert(
        table="sop_documents",
        data=rows,
        column_names=["id", "source", "chunk_text", "embedding"],
    )

    logger.info("Ingested SOP '%s': %d chunks stored in ClickHouse", source, len(rows))
    return len(rows)


def ingest_all_sops() -> dict[str, int]:
    """Scan /data/sops/ and ingest all PDF files.

    Returns:
        Dict mapping filename → number of chunks ingested (0 if skipped).
    """
    if not SOP_DIR.exists():
        logger.warning("SOP directory not found: %s — creating it", SOP_DIR)
        SOP_DIR.mkdir(parents=True, exist_ok=True)
        return {}

    pdf_files = sorted(SOP_DIR.glob("*.pdf"))
    if not pdf_files:
        logger.info("No PDF files found in %s", SOP_DIR)
        return {}

    logger.info("Found %d SOP PDFs in %s", len(pdf_files), SOP_DIR)

    results: dict[str, int] = {}
    for pdf_path in pdf_files:
        try:
            count = ingest_pdf(pdf_path)
            results[pdf_path.name] = count
        except Exception as exc:
            logger.error("Failed to ingest '%s': %s", pdf_path.name, exc)
            results[pdf_path.name] = -1

    total = sum(v for v in results.values() if v > 0)
    logger.info("SOP ingestion complete: %d total chunks from %d files", total, len(results))
    return results
