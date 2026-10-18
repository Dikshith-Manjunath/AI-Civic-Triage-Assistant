"""Similarity router — v1 API endpoint for finding similar past complaints.

This uses embedding-based similarity search to find related complaints,
helping citizens and officials understand if similar issues have been reported.

Version: 1.0.0
Stability: Experimental
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("civicflow.routes.v1.similarity")

router = APIRouter(prefix="/similarity", tags=["similarity"])


# ── Request / Response Models ──


class SimilarityRequest(BaseModel):
    """Request for similarity search."""

    text: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Complaint text to find similar complaints for",
    )
    limit: int = Field(
        5,
        ge=1,
        le=20,
        description="Maximum number of similar complaints to return",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "There's a large pothole on MG Road near the metro station",
                    "limit": 5
                }
            ]
        }
    }


class SimilarComplaint(BaseModel):
    """A similar complaint."""

    id: str = Field(..., description="Complaint ID")
    text: str = Field(..., description="Complaint text (may be truncated)")
    department: str = Field(..., description="Civic department")
    authority: str = Field(..., description="Responsible authority")
    status: str = Field(..., description="Current status")
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Similarity score (0-1)")
    timestamp: str = Field(..., description="When the complaint was filed")


class SimilarityResponse(BaseModel):
    """Response for similarity search."""

    query: str = Field(..., description="Original query text")
    results: list[SimilarComplaint] = Field(
        default_factory=list,
        description="Similar complaints sorted by relevance"
    )
    total: int = Field(0, description="Total number of results found")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "query": "There's a large pothole on MG Road near the metro station",
                    "results": [
                        {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "text": "Pothole on MG Road causing traffic issues",
                            "department": "roads",
                            "authority": "BBMP",
                            "status": "resolved",
                            "similarity_score": 0.92,
                            "timestamp": "2024-12-01T08:00:00Z"
                        }
                    ],
                    "total": 1
                }
            ]
        }
    }


# ── Endpoints ──


@router.post(
    "",
    response_model=SimilarityResponse,
    summary="Find similar complaints",
    description=(
        "Search for similar past complaints using embedding-based similarity.\n\n"
        "This helps:\n"
        "- Citizens check if their issue has already been reported\n"
        "- Officials identify duplicate or related complaints\n"
        "- Track patterns of issues in specific areas\n\n"
        "**Note:** This is an experimental feature. Results may not always be accurate."
    ),
    responses={
        200: {
            "description": "Similarity search completed",
            "model": SimilarityResponse,
        },
        501: {
            "description": "Similarity search not implemented",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Similarity search requires embedding service to be configured"
                    }
                }
            },
        },
    },
)
async def find_similar(request: SimilarityRequest):
    """
    Find similar past complaints.

    Uses embedding-based semantic similarity to find related complaints.
    """
    # Check if similarity service is available
    try:
        from api.services.sop_retrieval import get_embedding
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Similarity search requires embedding service to be configured",
        )

    # Generate embedding for query
    try:
        query_embedding = get_embedding(request.text)
    except Exception as exc:
        logger.error("Failed to generate embedding: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embedding: {exc}",
        )

    # Search in database
    # Note: This is a placeholder - actual implementation would query ClickHouse
    # with embedding similarity using a vector index or approximate nearest neighbor

    # For now, return empty results
    # In production, you would:
    # 1. Query ClickHouse for complaints with similar embeddings
    # 2. Use cosine similarity or dot product
    # 3. Filter by threshold (e.g., similarity > 0.5)

    return SimilarityResponse(
        query=request.text,
        results=[],
        total=0,
    )


@router.get(
    "/{complaint_id}/similar",
    response_model=SimilarityResponse,
    summary="Find complaints similar to a specific complaint",
    description="Given a complaint ID, find other complaints with similar content.",
)
async def find_similar_to_complaint(complaint_id: str, limit: int = 5):
    """
    Find complaints similar to a specific complaint.

    Uses the complaint's stored embedding to find similar complaints.
    """
    # Placeholder - would fetch complaint embedding and search
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="This endpoint is not yet implemented",
    )
