"""CivicFlow — FastAPI application entry point.

API Versioning:
- /api/v1/* - Current stable API (v1.0.0)
- /api/* - Legacy endpoints (deprecated, will be removed in v2)

See /docs for full API documentation.
"""

from __future__ import annotations

import logging
import sys
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.config import settings
from api.db.clickhouse import init_db
from api.middleware import setup_rate_limiting, get_all_circuit_stats
from api.middleware.deprecation import add_deprecation_middleware
from api.routes.classify import router as classify_router
from api.routes.complaints import router as complaints_router
from api.routes.discord import router as discord_router
from api.routes.similarity import router as similarity_router
from api.routes.tickets import router as tickets_router
from api.routes.v1 import classify_router as v1_classify_router
from api.routes.v1 import complaints_router as v1_complaints_router
from api.routes.v1 import tickets_router as v1_tickets_router
from api.routes.v1 import similarity_router as v1_similarity_router
from api.services.cache import close_redis_client, get_redis_client
from api.services.kafka import stop_kafka_producer
from api.services.metrics import (
    get_metrics,
    get_metrics_content_type,
    record_http_request,
    update_circuit_breaker_metrics,
)
from api.services.sop_ingest import ingest_all_sops
from api.services.storage import ensure_bucket

# ── Logging ──
# Setup structured logging
from api.services.structured_logging import setup_logging

# Use JSON format in production, human-readable in development
use_json_logging = settings.app_env in ("production", "staging")
setup_logging(
    level=settings.log_level,
    service_name="civicflow-api",
    environment=settings.app_env,
    json_format=use_json_logging,
)

logger = logging.getLogger("civicflow")

# Track startup time
_start_time: float = 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    global _start_time
    _start_time = time.time()

    logger.info("🚀 CivicFlow starting up  (env=%s)", settings.app_env)

    # ── Initialize OpenTelemetry Tracing ──
    if settings.tracing_enabled:
        from api.middleware.tracing import setup_tracing
        setup_tracing(
            app,
            service_name="civicflow-api",
            otlp_endpoint=settings.otlp_endpoint,
            sample_rate=settings.tracing_sample_rate,
        )
        logger.info("✅ OpenTelemetry tracing enabled")
    else:
        logger.info("OpenTelemetry tracing disabled")

    # ── Initialize Redis ──
    if settings.redis_enabled:
        try:
            await get_redis_client()
            logger.info("✅ Redis connected")
        except Exception as exc:
            logger.error("❌ Redis connection failed: %s", exc)
            logger.warning("Caching will be disabled - application will continue")
    else:
        logger.info("Redis caching disabled via config")

    # ── Initialize ClickHouse ──
    try:
        init_db()
        logger.info("✅ ClickHouse ready")
    except Exception as exc:
        logger.error("❌ ClickHouse init failed: %s", exc)
        logger.warning(
            "Server will start but DB operations will fail until ClickHouse is available"
        )

    # ── Initialize MinIO ──
    try:
        ensure_bucket()
        logger.info("✅ MinIO bucket ready")
    except Exception as exc:
        logger.error("❌ MinIO bucket init failed: %s", exc)
        logger.warning("Media uploads will fail until MinIO is available")

    # ── Ingest SOP Documents (RAG) ──
    try:
        results = ingest_all_sops()
        total = sum(v for v in results.values() if v > 0)
        logger.info("✅ SOP ingestion done — %d chunks from %d files", total, len(results))
    except Exception as exc:
        logger.error("❌ SOP ingestion failed: %s", exc)
        logger.warning("RAG grounding will be unavailable until SOPs are ingested")

    # ── Health check for Laya classifier ──
    if settings.laya_classifier_enabled:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{settings.laya_classifier_url}/health")
                if resp.status_code == 200:
                    logger.info("✅ Laya classifier ready")
                else:
                    logger.warning("⚠️ Laya classifier returned status %d", resp.status_code)
        except Exception as exc:
            logger.warning("⚠️ Laya classifier not reachable: %s", exc)
            logger.warning("Classification will use fallback rule-based system")

    yield  # application runs

    # ── Shutdown ──
    logger.info("🛑 CivicFlow shutting down...")

    # Close Kafka producer
    try:
        await stop_kafka_producer()
        logger.info("✅ Kafka producer closed")
    except Exception as exc:
        logger.warning("Kafka producer shutdown error: %s", exc)

    # Close Redis connection
    if settings.redis_enabled:
        try:
            await close_redis_client()
            logger.info("✅ Redis connection closed")
        except Exception as exc:
            logger.warning("Redis shutdown error: %s", exc)

    logger.info("👋 CivicFlow shutdown complete")


# ── Create Application ──
app = FastAPI(
    title="CivicFlow API",
    description=(
        "AI Civic Issue Triage Assistant for Bengaluru — Production Grade\n\n"
        "**API Versioning:**\n"
        "- `/api/v1/*` - Current stable API (recommended)\n"
        "- `/api/*` - Legacy endpoints (deprecated, will be removed in v2)\n\n"
        "**Features:**\n"
        "- Laya AI classifier for multimodal complaint classification\n"
        "- Redis caching for improved performance\n"
        "- PII detection and redaction\n"
        "- Kafka-based event streaming\n"
        "- Distributed tracing with OpenTelemetry\n\n"
        "**Documentation:**\n"
        "- Interactive docs: /docs\n"
        "- ReDoc: /redoc\n"
        "- OpenAPI spec: /openapi.json"
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=[
        {
            "name": "classification",
            "description": "Complaint classification endpoints - analyze text and determine department, authority, urgency",
        },
        {
            "name": "complaints",
            "description": "Complaint submission and retrieval - multimodal support (text, image, audio, PDF)",
        },
        {
            "name": "tickets",
            "description": "Ticket lifecycle management - approve, reject, and status transitions",
        },
        {
            "name": "similarity",
            "description": "Find similar past complaints using embedding-based search",
        },
        {
            "name": "meta",
            "description": "System health, metrics, and metadata endpoints",
        },
    ],
)

# ── CORS Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiting Middleware ──
setup_rate_limiting(app)

# ── Deprecation Middleware ──
add_deprecation_middleware(app)


# ── Request Timing & Metrics Middleware ──
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    """Add X-Process-Time header to all responses and collect metrics."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    elapsed_s = elapsed_ms / 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"

    # Record metrics (exclude /metrics endpoint to avoid recursion)
    if request.url.path != "/metrics":
        record_http_request(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code,
            duration=elapsed_s,
        )

    return response


# ── Middleware ──
# Request context middleware (must be added first to wrap all requests)
from api.middleware.request_context import add_request_context_middleware
add_request_context_middleware(app)


# ── Routers ──

# Version 1 API (stable, recommended)
app.include_router(v1_classify_router, prefix="/api/v1")
app.include_router(v1_complaints_router, prefix="/api/v1")
app.include_router(v1_tickets_router, prefix="/api/v1")
app.include_router(v1_similarity_router, prefix="/api/v1")

# Legacy API (deprecated, will be removed in v2)
app.include_router(classify_router, prefix="/api")
app.include_router(complaints_router, prefix="/api")
app.include_router(similarity_router, prefix="/api")
app.include_router(tickets_router, prefix="/api")

# Discord integration (webhooks, slash commands)
app.include_router(discord_router, prefix="/api")


# ── Health Check Endpoint ──
@app.get("/health", tags=["meta"])
async def health():
    """Health check endpoint with dependency status."""
    from datetime import datetime, UTC

    checks = {
        "database": "unknown",
        "redis": "unknown",
        "kafka": "unknown",
        "classifier": "unknown",
        "minio": "unknown",
    }

    # Check ClickHouse
    try:
        from api.db.clickhouse import get_client
        get_client().query("SELECT 1")
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    # Check Redis
    if settings.redis_enabled:
        try:
            client = await get_redis_client()
            await client.ping()
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "error"
    else:
        checks["redis"] = "disabled"

    # Check Kafka (just check if we can create a producer)
    checks["kafka"] = "not_checked"

    # Check Laya classifier
    if settings.laya_classifier_enabled:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(f"{settings.laya_classifier_url}/health")
                checks["classifier"] = "ok" if resp.status_code == 200 else "error"
        except Exception:
            checks["classifier"] = "error"
    else:
        checks["classifier"] = "disabled"

    # Check MinIO
    try:
        from api.services.storage import get_minio_client
        get_minio_client().bucket_exists(settings.minio_bucket)
        checks["minio"] = "ok"
    except Exception:
        checks["minio"] = "error"

    # Determine overall status
    all_ok = all(v in ("ok", "disabled", "not_checked", "unknown") for v in checks.values())
    status_text = "healthy" if all_ok else "degraded"

    uptime = time.time() - _start_time if _start_time else 0

    # Add circuit breaker status
    circuit_stats = get_all_circuit_stats()

    return {
        "status": status_text,
        "checks": checks,
        "circuit_breakers": circuit_stats,
        "version": "0.7.0",
        "uptime_seconds": round(uptime, 2),
        "timestamp": datetime.now(UTC).isoformat(),
    }


# ── Prometheus Metrics Endpoint ──
@app.get("/metrics", tags=["meta"])
async def metrics():
    """Prometheus metrics endpoint."""
    # Update circuit breaker metrics before export
    for name, stats in get_all_circuit_stats().items():
        update_circuit_breaker_metrics(
            name=name,
            state=stats.get("state", "closed"),
            failures=stats.get("consecutive_failures", 0),
        )

    return Response(
        content=get_metrics(),
        media_type=get_metrics_content_type(),
    )


# ── Root Endpoint ──
@app.get("/", tags=["meta"])
async def root():
    """Root endpoint with API info."""
    return {
        "name": "CivicFlow API",
        "version": "1.0.0",
        "description": "AI-powered civic issue triage system for Bengaluru",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "health": "/health",
        "metrics": "/metrics",
        "api_versions": {
            "v1": {
                "base_url": "/api/v1",
                "status": "stable",
                "endpoints": [
                    "/api/v1/classify",
                    "/api/v1/complaints",
                    "/api/v1/tickets",
                    "/api/v1/similarity",
                ],
            },
            "legacy": {
                "base_url": "/api",
                "status": "deprecated",
                "sunset": "2025-06-01",
                "message": "Use /api/v1/* endpoints instead",
            },
        },
    }


# ── OpenAPI Info Endpoint ──
@app.get("/openapi.json", tags=["meta"], include_in_schema=False)
async def get_openapi():
    """Get OpenAPI specification."""
    from fastapi.openapi.utils import get_openapi

    return get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
    )
