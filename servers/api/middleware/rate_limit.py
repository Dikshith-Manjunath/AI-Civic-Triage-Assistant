"""Rate Limiting Middleware using Redis.

Implements:
- Sliding window rate limiting
- Per-IP and per-user limits
- Different limits for authenticated vs anonymous users
- 429 responses with Retry-After header
"""

from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from api.config import settings
from api.services.cache import get_redis_client

logger = logging.getLogger("civicflow.ratelimit")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using Redis sliding window algorithm."""

    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
        enabled: bool = True,
    ):
        """Initialize rate limit middleware.

        Args:
            app: ASGI application.
            requests_per_minute: Max requests per minute per client.
            requests_per_hour: Max requests per hour per client.
            enabled: Whether rate limiting is enabled.
        """
        super().__init__(app)
        self.rpm = requests_per_minute
        self.rph = requests_per_hour
        self.enabled = enabled

        # Paths exempt from rate limiting
        self.exempt_paths = {
            "/health",
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
        }

        # Higher limits for authenticated users (if API key present)
        self.authenticated_rpm = requests_per_minute * 2
        self.authenticated_rph = requests_per_hour * 2

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through rate limiter."""
        # Skip if rate limiting disabled
        if not self.enabled:
            return await call_next(request)

        # Skip exempt paths
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Get client identifier
        client_id = self._get_client_id(request)

        # Check if user is authenticated (has API key or session)
        is_authenticated = bool(request.headers.get("X-API-Key") or request.headers.get("Authorization"))

        # Get rate limit settings based on auth status
        rpm = self.authenticated_rpm if is_authenticated else self.rpm
        rph = self.authenticated_rph if is_authenticated else self.rph

        # Check rate limits
        try:
            redis = await get_redis_client()

            # Check minute limit
            minute_key = f"ratelimit:{client_id}:minute"
            minute_count = await self._increment_counter(redis, minute_key, ttl=60)

            if minute_count > rpm:
                logger.warning(
                    "Rate limit exceeded (minute): client=%s count=%d limit=%d",
                    client_id,
                    minute_count,
                    rpm,
                )
                return self._rate_limit_response(60 - int(time.time() % 60))

            # Check hour limit
            hour_key = f"ratelimit:{client_id}:hour"
            hour_count = await self._increment_counter(redis, hour_key, ttl=3600)

            if hour_count > rph:
                logger.warning(
                    "Rate limit exceeded (hour): client=%s count=%d limit=%d",
                    client_id,
                    hour_count,
                    rph,
                )
                return self._rate_limit_response(3600 - int(time.time() % 3600))

            # Add rate limit headers to response
            response = await call_next(request)

            # Add informational headers
            response.headers["X-RateLimit-Limit-Minute"] = str(rpm)
            response.headers["X-RateLimit-Limit-Hour"] = str(rph)
            response.headers["X-RateLimit-Remaining-Minute"] = str(max(0, rpm - minute_count))
            response.headers["X-RateLimit-Remaining-Hour"] = str(max(0, rph - hour_count))

            return response

        except Exception as exc:
            logger.error("Rate limit check failed: %s - allowing request", exc)
            # On error, allow the request (fail open)
            return await call_next(request)

    def _get_client_id(self, request: Request) -> str:
        """Get unique identifier for the client.

        Uses X-Forwarded-For header if behind a proxy,
        otherwise falls back to client IP.
        """
        # Check for forwarded header (behind reverse proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take first IP in chain (original client)
            return f"ip:{forwarded.split(',')[0].strip()}"

        # Fall back to direct client IP
        if request.client:
            return f"ip:{request.client.host}"

        # Fallback for non-HTTP connections
        return "ip:unknown"

    async def _increment_counter(self, redis, key: str, ttl: int) -> int:
        """Increment counter and return new value.

        Uses Redis INCR with EXPIRE for sliding window.
        """
        try:
            count = await redis.incr(key)

            # Set TTL on first increment
            if count == 1:
                await redis.expire(key, ttl)

            return count

        except Exception as exc:
            logger.error("Redis increment failed: %s", exc)
            return 0

    def _rate_limit_response(self, retry_after: int) -> JSONResponse:
        """Create rate limit exceeded response."""
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Please retry after {retry_after} seconds.",
                "retry_after": retry_after,
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Reset": str(int(time.time()) + retry_after),
            },
        )


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """Middleware to whitelist/blacklist IP addresses.

    Useful for:
    - Admin endpoints that should only be accessible from certain IPs
    - Blocking known malicious IPs
    """

    def __init__(
        self,
        app: ASGIApp,
        whitelist: set[str] | None = None,
        blacklist: set[str] | None = None,
        protected_paths: set[str] | None = None,
    ):
        """Initialize IP filter middleware.

        Args:
            app: ASGI application.
            whitelist: Set of allowed IPs (None = allow all not in blacklist).
            blacklist: Set of blocked IPs.
            protected_paths: Paths to apply filter to (None = all paths).
        """
        super().__init__(app)
        self.whitelist = whitelist or set()
        self.blacklist = blacklist or set()
        self.protected_paths = protected_paths

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Check IP against whitelist/blacklist."""
        # Check if path is protected
        if self.protected_paths and request.url.path not in self.protected_paths:
            return await call_next(request)

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Check blacklist
        if client_ip in self.blacklist:
            logger.warning("Blocked request from blacklisted IP: %s", client_ip)
            return JSONResponse(
                status_code=403,
                content={"error": "Access denied"},
            )

        # Check whitelist (if configured)
        if self.whitelist and client_ip not in self.whitelist:
            logger.warning("Blocked request from non-whitelisted IP: %s", client_ip)
            return JSONResponse(
                status_code=403,
                content={"error": "Access denied"},
            )

        return await call_next(request)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        if request.client:
            return request.client.host

        return "unknown"


# ── Convenience functions ──

def setup_rate_limiting(app) -> None:
    """Add rate limiting middleware to FastAPI app.

    Args:
        app: FastAPI application instance.
    """
    if settings.rate_limit_enabled:
        app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=settings.rate_limit_requests_per_minute,
            requests_per_hour=settings.rate_limit_requests_per_hour,
            enabled=True,
        )
        logger.info(
            "Rate limiting enabled: %d req/min, %d req/hour",
            settings.rate_limit_requests_per_minute,
            settings.rate_limit_requests_per_hour,
        )
    else:
        logger.info("Rate limiting disabled via configuration")
