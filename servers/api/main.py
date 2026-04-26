"""CivicFlow — FastAPI application entry point."""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.db.clickhouse import init_db
from api.routes.complaints import router as complaints_router
from api.routes.discord import router as discord_router
from api.routes.similarity import router as similarity_router
from api.routes.tickets import router as tickets_router
from api.services.sop_ingest import ingest_all_sops
from api.services.storage import ensure_bucket

# ── Logging ──
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.DEBUG),
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("civicflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    logger.info("🚀 CivicFlow starting up  (env=%s)", settings.app_env)

    # Initialise ClickHouse schema
    try:
        init_db()
        logger.info("✅ ClickHouse ready")
    except Exception as exc:
        logger.error("❌ ClickHouse init failed: %s", exc)
        logger.warning(
            "Server will start but DB operations will fail until ClickHouse is available"
        )

    # Initialise MinIO bucket
    try:
        ensure_bucket()
        logger.info("✅ MinIO bucket ready")
    except Exception as exc:
        logger.error("❌ MinIO bucket init failed: %s", exc)
        logger.warning("Media uploads will fail until MinIO is available")

    # Ingest SOP documents (Phase 6 — RAG)
    try:
        results = ingest_all_sops()
        total = sum(v for v in results.values() if v > 0)
        logger.info("✅ SOP ingestion done — %d chunks from %d files", total, len(results))
    except Exception as exc:
        logger.error("❌ SOP ingestion failed: %s", exc)
        logger.warning("RAG grounding will be unavailable until SOPs are ingested")

    yield  # application runs

    logger.info("🛑 CivicFlow shutting down")


app = FastAPI(
    title="CivicFlow API",
    description="AI Civic Issue Triage Assistant for Bengaluru — Phase 1-6 (RAG + Discord Buttons)",
    version="0.6.0",
    lifespan=lifespan,
)

# ── CORS (allow the Next.js frontend) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──
app.include_router(complaints_router, prefix="/api")
app.include_router(similarity_router, prefix="/api")
app.include_router(tickets_router, prefix="/api")
app.include_router(discord_router, prefix="/api")


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "service": settings.app_name}
