"""CivicFlow FastAPI application entry point."""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import complaints, dashboard, tickets
from app.services.clickhouse_client import clickhouse_service
from app.services.kafka_producer import kafka_service
from app.services.minio_client import minio_service

logger = structlog.get_logger()
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting CivicFlow API", env=settings.app_env)

    # Initialize services
    await kafka_service.start()
    minio_service.ensure_bucket()
    clickhouse_service.ensure_tables()

    logger.info("All services initialized")
    yield

    # Shutdown
    await kafka_service.stop()
    logger.info("CivicFlow API shutdown complete")


app = FastAPI(
    title="CivicFlow API",
    description="AI Civic Issue Triage Assistant - Multimodal complaint ingestion & triage",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────
app.include_router(complaints.router, prefix="/api/v1", tags=["Complaints"])
app.include_router(tickets.router, prefix="/api/v1", tags=["Tickets"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["Dashboard"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "civicflow-api"}
