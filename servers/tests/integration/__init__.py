"""Integration tests requiring external services (Redis, ClickHouse, etc.)."""

import os
import pytest

# Skip all tests in this module if services are not available
pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_INTEGRATION_TESTS") != "true",
    reason="Set RUN_INTEGRATION_TESTS=true to run integration tests",
)


class TestRedisIntegration:
    """Integration tests for Redis caching."""

    @pytest.mark.asyncio
    async def test_redis_connection(self):
        """Test Redis connection can be established."""
        from api.services.cache import get_redis_client

        client = await get_redis_client()
        result = await client.ping()

        assert result is True

    @pytest.mark.asyncio
    async def test_redis_set_and_get(self):
        """Test Redis SET and GET operations."""
        from api.services.cache import cache_set, cache_get

        await cache_set("test_key", {"data": "test_value"}, ttl=60)
        result = await cache_get("test_key")

        assert result == {"data": "test_value"}

    @pytest.mark.asyncio
    async def test_cache_decorator(self):
        """Test cache_result decorator."""
        from api.services.cache import cache_result
        import time

        call_count = 0

        @cache_result("test_prefix", ttl=60)
        async def expensive_function(arg1, arg2):
            nonlocal call_count
            call_count += 1
            time.sleep(0.1)
            return {"result": arg1 + arg2}

        # First call
        result1 = await expensive_function("a", "b")
        assert result1 == {"result": "ab"}
        assert call_count == 1

        # Second call should hit cache
        result2 = await expensive_function("a", "b")
        assert result2 == {"result": "ab"}
        assert call_count == 1  # Not incremented


class TestClickHouseIntegration:
    """Integration tests for ClickHouse database."""

    def test_clickhouse_connection(self):
        """Test ClickHouse connection can be established."""
        from api.db.clickhouse import get_client

        client = get_client()
        result = client.query("SELECT 1 as test")

        assert result.result_rows[0][0] == 1

    def test_database_exists(self):
        """Test that the civicflow database exists."""
        from api.db.clickhouse import get_client

        client = get_client()
        result = client.query("SELECT name FROM system.databases WHERE name = 'civicflow'")

        assert len(result.result_rows) > 0


class TestCircuitBreakerWithRealCalls:
    """Test circuit breaker with actual service calls."""

    @pytest.mark.asyncio
    async def test_circuit_breaker_with_http_call(self):
        """Test circuit breaker with real HTTP call."""
        import httpx
        from api.middleware.circuit_breaker import get_circuit_breaker

        breaker = get_circuit_breaker("httpbin-test", failure_threshold=2)

        async def make_request():
            async with httpx.AsyncClient() as client:
                response = await client.get("https://httpbin.org/status/500")
                response.raise_for_status()
                return response

        # Should fail and open circuit
        for _ in range(3):
            try:
                await breaker.call(make_request)
            except Exception:
                pass

        assert breaker.state.name == "OPEN"
