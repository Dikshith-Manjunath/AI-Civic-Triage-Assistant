"""Request Context Middleware for CivicFlow.

This middleware manages:
- Request ID generation and tracking
- User context extraction
- Request timing
- Context propagation to logs and traces
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from api.services.structured_logging import (
    set_request_id,
    set_user_id,
    clear_context,
    get_logger,
)

logger = get_logger("civicflow.middleware")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Middleware that manages request context for logging and tracing."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with context management."""
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:16]
        set_request_id(request_id)

        # Extract user context if available
        user_id = request.headers.get("X-User-ID")
        if user_id:
            set_user_id(user_id)

        # Track request timing
        start_time = time.perf_counter()

        try:
            # Process request
            response = await call_next(request)

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            # Log request completion
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                "Request completed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "request_id": request_id,
                },
            )

            return response

        except Exception as exc:
            # Log error
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "Request failed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "request_id": request_id,
                    "error": str(exc),
                },
            )
            raise

        finally:
            # Clear context
            clear_context()


def add_request_context_middleware(app: FastAPI) -> None:
    """Add request context middleware to FastAPI app."""
    app.add_middleware(RequestContextMiddleware)
