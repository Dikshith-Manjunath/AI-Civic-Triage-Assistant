"""API v1 routes module."""

from api.routes.v1.classify import router as classify_router
from api.routes.v1.complaints import router as complaints_router
from api.routes.v1.tickets import router as tickets_router
from api.routes.v1.similarity import router as similarity_router

__all__ = ["classify_router", "complaints_router", "tickets_router", "similarity_router"]
