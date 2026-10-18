"""Deprecation middleware for API versioning.

Adds deprecation headers to endpoints that are being phased out,
allowing clients to migrate to newer versions gracefully.
"""

from __future__ import annotations

import logging
from typing import Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("civicflow.middleware.deprecation")


# Endpoints that are deprecated and should show warnings
DEPRECATED_PATHS = {
    # Legacy endpoints (before v1)
    "/api/complaints": {
        "sunset": "2025-06-01",
        "replacement": "/api/v1/complaints",
        "message": "Use /api/v1/complaints instead",
    },
    "/api/classify": {
        "sunset": "2025-06-01",
        "replacement": "/api/v1/classify",
        "message": "Use /api/v1/classify instead",
    },
}


class DeprecationMiddleware(BaseHTTPMiddleware):
    """Middleware that adds deprecation headers to outgoing responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and add deprecation headers if needed."""
        response = await call_next(request)

        # Check if path is deprecated
        path = request.url.path

        # Check for exact match or deprecated prefix
        for deprecated_path, info in DEPRECATED_PATHS.items():
            if path == deprecated_path or path.startswith(deprecated_path + "/"):
                # Add deprecation headers
                response.headers["Deprecation"] = "true"
                response.headers["Sunset"] = info["sunset"]
                response.headers["Link"] = (
                    f'<{info["replacement"]}>; rel="successor-version"'
                )
                response.headers["X-Deprecated-Message"] = info["message"]

                # Log deprecation warning
                logger.warning(
                    "Deprecated endpoint called: %s -> %s",
                    path,
                    info["replacement"],
                )
                break

        return response


def add_deprecation_middleware(app: FastAPI) -> None:
    """Add deprecation middleware to the FastAPI app."""
    app.add_middleware(DeprecationMiddleware)
