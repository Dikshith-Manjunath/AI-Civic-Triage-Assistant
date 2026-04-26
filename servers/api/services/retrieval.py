"""Retrieval service — semantic similarity search over complaint embeddings."""

from __future__ import annotations

import logging

from api.db.clickhouse import get_client

logger = logging.getLogger("civicflow.retrieval")


def find_similar_complaints(
    embedding: list[float],
    limit: int = 5,
    exclude_id: str | None = None,
) -> list[dict]:
    """Find the most similar past complaints using cosine distance.

    Args:
        embedding: Query embedding vector (384-dim float list).
        limit: Maximum number of similar results to return.
        exclude_id: Optional complaint ID to exclude (e.g. the current one).

    Returns:
        List of dicts with keys: id, summary, dept, authority, urgency, score.
    """
    client = get_client()

    # Build WHERE clause to skip empty embeddings and optionally exclude self
    where_clauses = ["length(embedding) > 0"]
    params: dict = {"query_embedding": embedding, "lim": limit}

    if exclude_id:
        where_clauses.append("id != %(exclude_id)s")
        params["exclude_id"] = exclude_id

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            id,
            summary,
            dept,
            authority,
            urgency,
            cosineDistance(embedding, %(query_embedding)s) AS distance
        FROM civic_complaints
        WHERE {where_sql}
        ORDER BY distance ASC
        LIMIT %(lim)s
    """

    try:
        result = client.query(query, parameters=params)
        rows = []
        for row in result.result_rows:
            rows.append(
                {
                    "id": str(row[0]),
                    "summary": row[1],
                    "dept": row[2],
                    "authority": row[3],
                    "urgency": row[4],
                    "score": round(1.0 - row[5], 4),  # convert distance → similarity
                }
            )
        logger.info("Found %d similar complaints (limit=%d)", len(rows), limit)
        return rows
    except Exception as exc:
        logger.error("Similarity search failed: %s", exc)
        return []


def find_similar_by_id(complaint_id: str, limit: int = 5) -> list[dict]:
    """Find similar complaints to an existing complaint by its ID.

    Args:
        complaint_id: UUID of the complaint to find neighbours for.
        limit: Max results.

    Returns:
        List of similar complaint dicts.
    """
    client = get_client()

    # Fetch the embedding of the given complaint
    result = client.query(
        "SELECT embedding FROM civic_complaints WHERE id = %(cid)s LIMIT 1",
        parameters={"cid": complaint_id},
    )

    if not result.result_rows:
        logger.warning("Complaint %s not found", complaint_id)
        return []

    embedding = result.result_rows[0][0]
    if not embedding or len(embedding) == 0:
        logger.warning("Complaint %s has no embedding", complaint_id)
        return []

    return find_similar_complaints(embedding, limit=limit, exclude_id=complaint_id)
