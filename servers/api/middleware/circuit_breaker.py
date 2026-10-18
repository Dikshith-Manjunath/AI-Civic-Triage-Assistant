"""Circuit Breaker Pattern Implementation.

Protects external service calls from cascading failures by:
- Tracking success/failure rates
- Opening circuit after threshold failures
- Allowing periodic retry (half-open state)
- Auto-recovering when service recovers

States:
- CLOSED: Normal operation, requests pass through
- OPEN: Requests fail fast, no calls to external service
- HALF_OPEN: Testing if service recovered (limited requests)
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, TypeVar

logger = logging.getLogger("civicflow.circuitbreaker")

F = TypeVar("F", bound=Callable[..., Any])


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing fast
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitStats:
    """Statistics for circuit breaker."""

    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    consecutive_failures: int = 0
    last_failure_time: float = 0.0
    last_success_time: float = 0.0
    state: CircuitState = CircuitState.CLOSED
    opened_at: float = 0.0


@dataclass
class CircuitBreaker:
    """Circuit breaker for a single service.

    Usage:
        breaker = CircuitBreaker(
            name="laya-classifier",
            failure_threshold=5,
            recovery_timeout=30,
        )

        result = await breaker.call(classify_complaint, text)
    """

    name: str
    failure_threshold: int = 5
    recovery_timeout: float = 30.0  # seconds
    half_open_max_calls: int = 3
    success_threshold: int = 2  # successes needed to close from half-open

    _stats: CircuitStats = field(default_factory=CircuitStats, repr=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False)

    @property
    def state(self) -> CircuitState:
        """Get current circuit state."""
        return self._stats.state

    @property
    def is_open(self) -> bool:
        """Check if circuit is open (failing fast)."""
        if self._stats.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if time.time() - self._stats.opened_at >= self.recovery_timeout:
                # Transition to half-open
                self._stats.state = CircuitState.HALF_OPEN
                logger.info(
                    "Circuit '%s' transitioned to HALF_OPEN after %.1fs",
                    self.name,
                    self.recovery_timeout,
                )
                return False
            return True
        return False

    @property
    def stats(self) -> dict[str, Any]:
        """Get current statistics."""
        return {
            "name": self.name,
            "state": self._stats.state.value,
            "total_calls": self._stats.total_calls,
            "successful_calls": self._stats.successful_calls,
            "failed_calls": self._stats.failed_calls,
            "consecutive_failures": self._stats.consecutive_failures,
            "failure_rate": (
                self._stats.failed_calls / self._stats.total_calls
                if self._stats.total_calls > 0
                else 0
            ),
        }

    async def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Execute a function through the circuit breaker.

        Args:
            func: Async function to call.
            *args: Positional arguments for the function.
            **kwargs: Keyword arguments for the function.

        Returns:
            Result from the function.

        Raises:
            CircuitOpenError: If circuit is open.
            Exception: Any exception from the function call.
        """
        async with self._lock:
            # Check if circuit is open
            if self.is_open:
                raise CircuitOpenError(
                    f"Circuit '{self.name}' is OPEN - failing fast. "
                    f"Retry after {self.recovery_timeout:.0f}s."
                )

            # In half-open state, limit concurrent calls
            if self._stats.state == CircuitState.HALF_OPEN:
                if self._stats.total_calls >= self.half_open_max_calls:
                    raise CircuitOpenError(
                        f"Circuit '{self.name}' is HALF_OPEN with pending test calls."
                    )

            self._stats.total_calls += 1

        # Execute the call outside the lock
        try:
            result = await func(*args, **kwargs)
            await self._record_success()
            return result

        except Exception as exc:
            await self._record_failure()
            raise

    async def _record_success(self) -> None:
        """Record a successful call."""
        async with self._lock:
            self._stats.successful_calls += 1
            self._stats.consecutive_failures = 0
            self._stats.last_success_time = time.time()

            if self._stats.state == CircuitState.HALF_OPEN:
                # Check if we have enough successes to close
                recent_successes = (
                    self._stats.successful_calls
                )  # Simplified; could track window
                if recent_successes >= self.success_threshold:
                    self._stats.state = CircuitState.CLOSED
                    logger.info(
                        "Circuit '%s' CLOSED after %d successful calls",
                        self.name,
                        recent_successes,
                    )

    async def _record_failure(self) -> None:
        """Record a failed call."""
        async with self._lock:
            self._stats.failed_calls += 1
            self._stats.consecutive_failures += 1
            self._stats.last_failure_time = time.time()

            if self._stats.state == CircuitState.HALF_OPEN:
                # Immediately open on any failure in half-open
                self._stats.state = CircuitState.OPEN
                self._stats.opened_at = time.time()
                logger.warning(
                    "Circuit '%s' re-opened from HALF_OPEN due to failure",
                    self.name,
                )

            elif self._stats.consecutive_failures >= self.failure_threshold:
                self._stats.state = CircuitState.OPEN
                self._stats.opened_at = time.time()
                logger.warning(
                    "Circuit '%s' OPENED after %d consecutive failures",
                    self.name,
                    self._stats.consecutive_failures,
                )

    def reset(self) -> None:
        """Manually reset the circuit breaker."""
        self._stats = CircuitStats()
        logger.info("Circuit '%s' manually reset", self.name)

    def force_open(self) -> None:
        """Manually open the circuit (for maintenance)."""
        self._stats.state = CircuitState.OPEN
        self._stats.opened_at = time.time()
        logger.warning("Circuit '%s' manually opened", self.name)


class CircuitOpenError(Exception):
    """Raised when circuit is open and rejecting calls."""

    pass


# ── Global registry of circuit breakers ──

_circuit_breakers: dict[str, CircuitBreaker] = {}


def get_circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: float = 30.0,
) -> CircuitBreaker:
    """Get or create a circuit breaker by name.

    Args:
        name: Unique name for the service being protected.
        failure_threshold: Number of failures before opening.
        recovery_timeout: Seconds before attempting recovery.

    Returns:
        CircuitBreaker instance.
    """
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
        )
    return _circuit_breakers[name]


def get_all_circuit_stats() -> dict[str, dict[str, Any]]:
    """Get statistics for all circuit breakers."""
    return {name: cb.stats for name, cb in _circuit_breakers.items()}


def reset_all_circuits() -> None:
    """Reset all circuit breakers."""
    for cb in _circuit_breakers.values():
        cb.reset()
    logger.info("All circuit breakers reset")


# ── Decorator for circuit breaker ──


def with_circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: float = 30.0,
    fallback: Callable[..., Any] | None = None,
) -> Callable[[F], F]:
    """Decorator to wrap a function with a circuit breaker.

    Args:
        name: Circuit breaker name.
        failure_threshold: Failures before opening.
        recovery_timeout: Seconds before recovery attempt.
        fallback: Optional fallback function when circuit is open.

    Returns:
        Decorated function.

    Example:
        @with_circuit_breaker("laya-classifier", fallback=rule_based_classify)
        async def classify_with_laya(text: str) -> dict:
            ...
    """
    breaker = get_circuit_breaker(name, failure_threshold, recovery_timeout)

    def decorator(func: F) -> F:
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return await breaker.call(func, *args, **kwargs)
            except CircuitOpenError as exc:
                if fallback is not None:
                    logger.warning(
                        "Circuit '%s' open, using fallback for %s",
                        name,
                        func.__name__,
                    )
                    return await fallback(*args, **kwargs)
                raise

        return wrapper  # type: ignore

    return decorator
