"""Unit tests for middleware components."""

import asyncio
import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from api.middleware.circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    CircuitOpenError,
    get_circuit_breaker,
    get_all_circuit_stats,
    with_circuit_breaker,
)


class TestCircuitBreaker:
    """Test circuit breaker pattern implementation."""

    def test_initial_state_is_closed(self):
        """Test that circuit breaker starts in CLOSED state."""
        breaker = CircuitBreaker(name="test-service")

        assert breaker.state == CircuitState.CLOSED
        assert breaker.is_open is False

    def test_opens_after_threshold_failures(self):
        """Test that circuit opens after consecutive failures."""
        breaker = CircuitBreaker(
            name="test-service",
            failure_threshold=3,
            recovery_timeout=10.0,
        )

        # Simulate failures
        for _ in range(3):
            asyncio.run(breaker._record_failure())

        assert breaker.state == CircuitState.OPEN
        assert breaker.is_open is True

    def test_prevents_calls_when_open(self):
        """Test that circuit prevents calls when open."""
        breaker = CircuitBreaker(
            name="test-service",
            failure_threshold=1,
            recovery_timeout=10.0,
        )

        # Open the circuit
        asyncio.run(breaker._record_failure())

        # Attempt to call should fail
        async def mock_call():
            return "should not reach here"

        with pytest.raises(CircuitOpenError):
            asyncio.run(breaker.call(mock_call))

    def test_transitions_to_half_open_after_timeout(self):
        """Test transition to HALF_OPEN after recovery timeout."""
        breaker = CircuitBreaker(
            name="test-service",
            failure_threshold=1,
            recovery_timeout=0.1,  # 100ms for fast test
        )

        # Open the circuit
        asyncio.run(breaker._record_failure())
        assert breaker.state == CircuitState.OPEN

        # Wait for recovery timeout
        time.sleep(0.15)

        # Check is_open should return False and transition to HALF_OPEN
        assert breaker.is_open is False
        assert breaker.state == CircuitState.HALF_OPEN

    def test_closes_after_successful_calls_in_half_open(self):
        """Test that circuit closes after successes in HALF_OPEN."""
        breaker = CircuitBreaker(
            name="test-service",
            failure_threshold=1,
            recovery_timeout=0.1,
            success_threshold=2,
        )

        # Open the circuit
        asyncio.run(breaker._record_failure())

        # Wait for timeout
        time.sleep(0.15)

        # Transition to half-open
        _ = breaker.is_open
        assert breaker.state == CircuitState.HALF_OPEN

        # Record successful calls
        for _ in range(2):
            asyncio.run(breaker._record_success())

        assert breaker.state == CircuitState.CLOSED

    def test_reopens_on_failure_in_half_open(self):
        """Test that circuit reopens on failure in HALF_OPEN."""
        breaker = CircuitBreaker(
            name="test-service",
            failure_threshold=1,
            recovery_timeout=0.1,
        )

        # Open the circuit
        asyncio.run(breaker._record_failure())

        # Wait for timeout
        time.sleep(0.15)

        # Transition to half-open
        _ = breaker.is_open

        # Record failure in half-open
        asyncio.run(breaker._record_failure())

        assert breaker.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_successful_call_returns_result(self):
        """Test that successful calls return their result."""
        breaker = CircuitBreaker(name="test-service")

        async def successful_call():
            return {"data": "success"}

        result = await breaker.call(successful_call)

        assert result == {"data": "success"}
        assert breaker.stats["successful_calls"] == 1

    @pytest.mark.asyncio
    async def test_failed_call_records_failure(self):
        """Test that failed calls record the failure."""
        breaker = CircuitBreaker(name="test-service")

        async def failed_call():
            raise ValueError("Connection failed")

        with pytest.raises(ValueError):
            await breaker.call(failed_call)

        assert breaker.stats["failed_calls"] == 1

    def test_reset_clears_state(self):
        """Test that reset clears all state."""
        breaker = CircuitBreaker(name="test-service")

        # Add some state
        asyncio.run(breaker._record_failure())
        asyncio.run(breaker._record_failure())

        # Reset
        breaker.reset()

        assert breaker.state == CircuitState.CLOSED
        assert breaker.stats["total_calls"] == 0
        assert breaker.stats["failed_calls"] == 0

    def test_stats_include_all_metrics(self):
        """Test that stats returns all required metrics."""
        breaker = CircuitBreaker(name="test-service")

        stats = breaker.stats

        assert "name" in stats
        assert "state" in stats
        assert "total_calls" in stats
        assert "successful_calls" in stats
        assert "failed_calls" in stats
        assert "failure_rate" in stats


class TestCircuitBreakerRegistry:
    """Test global circuit breaker registry."""

    def test_get_circuit_breaker_creates_new(self):
        """Test that get_circuit_breaker creates new breaker."""
        breaker = get_circuit_breaker("new-service")

        assert breaker is not None
        assert breaker.name == "new-service"

    def test_get_circuit_breaker_returns_same_instance(self):
        """Test that get_circuit_breaker returns same instance."""
        breaker1 = get_circuit_breaker("same-service")
        breaker2 = get_circuit_breaker("same-service")

        assert breaker1 is breaker2

    def test_get_all_circuit_stats(self):
        """Test getting stats for all circuits."""
        # Create a few breakers
        get_circuit_breaker("service-a")
        get_circuit_breaker("service-b")

        stats = get_all_circuit_stats()

        assert isinstance(stats, dict)
        assert "service-a" in stats
        assert "service-b" in stats


class TestCircuitBreakerDecorator:
    """Test the circuit breaker decorator."""

    @pytest.mark.asyncio
    async def test_decorator_protects_function(self):
        """Test that decorator applies circuit breaker to function."""
        call_count = 0

        @with_circuit_breaker(
            "test-decorator",
            failure_threshold=2,
        )
        async def protected_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Simulated failure")
            return "success"

        # First two calls should fail
        for _ in range(2):
            with pytest.raises(ValueError):
                await protected_function()

        # Third call should trigger open circuit
        with pytest.raises(CircuitOpenError):
            await protected_function()

    @pytest.mark.asyncio
    async def test_decorator_with_fallback(self):
        """Test that decorator uses fallback when circuit is open."""
        breaker = get_circuit_breaker("test-with-fallback", failure_threshold=1)

        # Open the circuit
        await breaker._record_failure()

        async def fallback_handler():
            return "fallback result"

        @with_circuit_breaker(
            "test-with-fallback",
            fallback=fallback_handler,
        )
        async def protected_function():
            return "primary result"

        result = await protected_function()

        assert result == "fallback result"


class TestRateLimitingMiddleware:
    """Test rate limiting middleware (basic tests without Redis)."""

    def test_exempt_paths_defined(self):
        """Test that exempt paths are properly defined."""
        from api.middleware.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(
            app=MagicMock(),
            requests_per_minute=60,
        )

        exempt = middleware.exempt_paths

        assert "/health" in exempt
        assert "/" in exempt
        assert "/docs" in exempt

    def test_authenticated_users_get_higher_limits(self):
        """Test that authenticated users get 2x limits."""
        from api.middleware.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(
            app=MagicMock(),
            requests_per_minute=60,
            requests_per_hour=1000,
        )

        assert middleware.authenticated_rpm == 120  # 2x
        assert middleware.authenticated_rph == 2000  # 2x
