"""Middleware package for CivicFlow API."""

from .circuit_breaker import (
    CircuitBreaker,
    CircuitOpenError,
    CircuitState,
    get_all_circuit_stats,
    get_circuit_breaker,
    reset_all_circuits,
    with_circuit_breaker,
)
from .rate_limit import IPWhitelistMiddleware, RateLimitMiddleware, setup_rate_limiting

__all__ = [
    # Circuit breaker
    "CircuitBreaker",
    "CircuitOpenError",
    "CircuitState",
    "get_circuit_breaker",
    "get_all_circuit_stats",
    "reset_all_circuits",
    "with_circuit_breaker",
    # Rate limiting
    "RateLimitMiddleware",
    "IPWhitelistMiddleware",
    "setup_rate_limiting",
]
