"""RAG retrieval node: find similar past tickets and SOP context."""

from __future__ import annotations

import structlog

from app.services.clickhouse_client import clickhouse_service

logger = structlog.get_logger()

# Lazy-load embedding model
_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            from app.config import get_settings
            settings = get_settings()
            _embedder = SentenceTransformer(settings.embedding_model)
            logger.info("Embedding model loaded", model=settings.embedding_model)
        except Exception as e:
            logger.warning("Embedding model unavailable", error=str(e))
            _embedder = "unavailable"
    return _embedder if _embedder != "unavailable" else None


async def retrieve_similar(state: dict) -> dict:
    """
    Retrieve similar past complaints using vector search
    and any relevant SOP context for the detected department.
    """
    log = logger.bind(complaint_id=state["complaint_id"])
    text = state.get("unified_text", "")

    similar_tickets = []
    sop_context = ""
    embedding = []

    # Generate embedding for current complaint
    embedder = _get_embedder()
    if embedder and text:
        try:
            embedding = embedder.encode(text).tolist()

            # Search ClickHouse for similar tickets
            similar_tickets = clickhouse_service.search_similar(embedding, limit=5)
            log.info("Similar tickets found", count=len(similar_tickets))
        except Exception as e:
            log.warning("Vector search failed", error=str(e))

    # Build SOP context from similar tickets
    if similar_tickets:
        sop_parts = []
        for ticket in similar_tickets[:3]:
            sop_parts.append(
                f"- Department: {ticket['dept']}, Urgency: {ticket['urgency']}, "
                f"Summary: {ticket['summary']}"
            )
        sop_context = "Similar past complaints:\n" + "\n".join(sop_parts)

    # Add department hint from NER
    entities = state.get("entities", {})
    if entities.get("dept_hint"):
        sop_context += f"\n\nKeyword-based department suggestion: {entities['dept_hint']}"

    return {
        **state,
        "similar_tickets": similar_tickets,
        "sop_context": sop_context,
        "embedding": embedding,
    }
