"""Embedding service — generates dense vectors using sentence-transformers."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger("civicflow.embeddings")

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384  # output dimension of all-MiniLM-L6-v2

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Lazy-load the sentence-transformers model (singleton)."""
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s", MODEL_NAME)
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(MODEL_NAME)
        logger.info("Embedding model loaded (dim=%d)", EMBEDDING_DIM)
    return _model


def generate_embedding(text: str) -> list[float]:
    """Generate a dense embedding vector for the given text.

    Args:
        text: Input text (complaint, summary, etc.)

    Returns:
        List of floats with length EMBEDDING_DIM (384).
    """
    model = _get_model()
    vector = model.encode(text, normalize_embeddings=True)
    embedding = vector.tolist()
    logger.debug("Generated embedding for text (%d chars) → dim=%d", len(text), len(embedding))
    return embedding
