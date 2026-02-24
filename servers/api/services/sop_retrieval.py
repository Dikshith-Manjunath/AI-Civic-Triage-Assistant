"""SOP Retrieval — semantic search over ingested SOP document chunks."""

from __future__ import annotations

import logging

from api.db.clickhouse import get_client

logger = logging.getLogger("civicflow.sop_retrieval")


def retrieve_relevant_sops(
    query_embedding: list[float],
    limit: int = 5,
) -> list[dict]:
    """Retrieve the most relevant SOP chunks for a query embedding.

    Args:
        query_embedding: 384-dim embedding vector from the complaint text.
        limit: Maximum number of SOP chunks to return.

    Returns:
        List of dicts with keys: id, source, chunk_text, score.
    """
    client = get_client()

    query = """
        SELECT
            id,
            source,
            chunk_text,
            cosineDistance(embedding, %(query_embedding)s) AS distance
        FROM sop_documents
        WHERE length(embedding) > 0
        ORDER BY distance ASC
        LIMIT %(lim)s
    """

    try:
        result = client.query(
            query,
            parameters={"query_embedding": query_embedding, "lim": limit},
        )
        rows: list[dict] = []
        for row in result.result_rows:
            rows.append({
                "id": str(row[0]),
                "source": row[1],
                "chunk_text": row[2],
                "score": round(1.0 - row[3], 4),  # cosine similarity
            })

        logger.info(
            "Retrieved %d SOP chunks (limit=%d, top_score=%.4f)",
            len(rows),
            limit,
            rows[0]["score"] if rows else 0.0,
        )
        return rows
    except Exception as exc:
        logger.error("SOP retrieval failed: %s", exc)
        return []
