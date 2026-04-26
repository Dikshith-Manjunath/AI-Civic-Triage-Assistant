"""Similarity router — GET /api/v1/complaints/{id}/similar endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from api.services.retrieval import find_similar_by_id

logger = logging.getLogger("civicflow.routes.similarity")

router = APIRouter(prefix="/v1/complaints", tags=["similarity"])


class SimilarComplaint(BaseModel):
    """A single similar complaint entry."""

    id: str
    summary: str
    dept: str
    authority: str
    urgency: int
    score: float


class SimilarResponse(BaseModel):
    """Response for the similarity endpoint."""

    complaint_id: str
    similar: list[SimilarComplaint]


@router.get(
    "/{complaint_id}/similar",
    response_model=SimilarResponse,
    summary="Find similar complaints",
    description="Returns the most semantically similar past complaints using vector search.",
)
async def get_similar_complaints(complaint_id: str, limit: int = 5):
    """Find complaints similar to the given complaint ID."""
    if limit < 1 or limit > 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="limit must be between 1 and 50",
        )

    results = find_similar_by_id(complaint_id, limit=limit)

    if results is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found or has no embedding",
        )

    logger.info("Returning %d similar complaints for %s", len(results), complaint_id)
    return SimilarResponse(
        complaint_id=complaint_id,
        similar=[SimilarComplaint(**r) for r in results],
    )
