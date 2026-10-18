"""End-to-end tests for CivicFlow."""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient


class TestAPIHealth:
    """Test API health and basic endpoints."""

    def test_root_endpoint(self, test_client: TestClient):
        """Test root endpoint returns API info."""
        response = test_client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "CivicFlow API"
        assert "version" in data
        assert data["docs"] == "/docs"

    def test_health_endpoint_structure(self, test_client: TestClient):
        """Test health endpoint returns proper structure."""
        response = test_client.get("/health")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert "checks" in data
        assert "version" in data
        assert "uptime_seconds" in data

        # Check all expected services are in checks
        assert "database" in data["checks"]
        assert "redis" in data["checks"]
        assert "kafka" in data["checks"]
        assert "classifier" in data["checks"]
        assert "minio" in data["checks"]

    def test_health_endpoint_has_circuit_breakers(self, test_client: TestClient):
        """Test health endpoint includes circuit breaker stats."""
        response = test_client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # Circuit breaker stats should be present
        assert "circuit_breakers" in data
        assert isinstance(data["circuit_breakers"], dict)

    def test_metrics_endpoint(self, test_client: TestClient):
        """Test Prometheus metrics endpoint."""
        response = test_client.get("/metrics")

        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]
        # Should contain metric names
        assert b"civicflow_" in response.content

    def test_docs_endpoint(self, test_client: TestClient):
        """Test OpenAPI docs are available."""
        response = test_client.get("/docs")

        assert response.status_code == 200

    def test_openapi_json(self, test_client: TestClient):
        """Test OpenAPI JSON spec is available."""
        response = test_client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data


class TestComplaintSubmission:
    """Test complaint submission flow."""

    def test_submit_complaint_basic(self, test_client: TestClient):
        """Test basic complaint submission."""
        response = test_client.post(
            "/api/complaints",
            json={
                "text": "Large pothole on MG Road causing traffic jams",
                "channel": "api",
            },
        )

        # Should process even if dependencies are down (fallback mode)
        assert response.status_code in [200, 201, 503]

    def test_submit_complaint_with_location(self, test_client: TestClient):
        """Test complaint submission with location."""
        response = test_client.post(
            "/api/complaints",
            json={
                "text": "No water supply in Koramangala",
                "channel": "telegram",
                "location": "Koramangala 4th Block, Bengaluru",
                "user_id": "test_user_123",
            },
        )

        assert response.status_code in [200, 201, 503]

    def test_submit_complaint_validation(self, test_client: TestClient):
        """Test complaint validation."""
        # Empty text should fail
        response = test_client.post(
            "/api/complaints",
            json={"text": "", "channel": "api"},
        )

        # Should return validation error
        assert response.status_code in [400, 422]


class TestClassificationFlow:
    """Test end-to-end classification flow."""

    def test_classification_returns_complete_structure(self, test_client: TestClient):
        """Test classification returns all required fields."""
        # This tests the fallback classifier since Laya is not available in tests

        response = test_client.post(
            "/api/complaints",
            json={
                "text": "Danger! Large pothole on MG Road causing accidents!",
                "channel": "test",
            },
        )

        if response.status_code in [200, 201]:
            data = response.json()

            # Should have classification data
            if "classification" in data:
                classification = data["classification"]

                assert classification["department"] in [
                    "roads", "water", "sanitation", "electricity",
                    "transport", "housing", "planning"
                ]
                assert classification["authority"] in [
                    "BBMP", "BWSSB", "BESCOM", "BMTC", "BDA", "GBA", "BMRDA", "KSDB", "BEML"
                ]
                assert classification["urgency"] in [0, 1, 2]


class TestCircuitBreakerE2E:
    """Test circuit breaker in real API context."""

    def test_circuit_breaker_protected_endpoint(self, test_client: TestClient):
        """Test that circuit breaker is active in API calls."""
        # Make a request
        response = test_client.get("/health")

        assert response.status_code == 200

        # Check circuit breakers were created
        response2 = test_client.get("/health")
        data = response2.json()

        # Circuit breakers should be tracked
        assert "circuit_breakers" in data


class TestMetricsIntegration:
    """Test metrics collection through real API calls."""

    def test_http_request_metrics_collected(self, test_client: TestClient):
        """Test that HTTP requests generate metrics."""
        # Make some requests
        test_client.get("/")
        test_client.get("/health")

        # Check metrics endpoint has data
        metrics_response = test_client.get("/metrics")

        assert metrics_response.status_code == 200
        content = metrics_response.content.decode()

        # Should have HTTP request metrics
        assert "civicflow_http_requests_total" in content

    def test_different_endpoints_tracked_separately(self, test_client: TestClient):
        """Test that different endpoints are tracked in metrics."""
        test_client.get("/health")
        test_client.get("/")

        metrics = test_client.get("/metrics").content.decode()

        # Should have endpoint labels
        assert 'endpoint="/health"' in metrics or "health" in metrics


class TestErrorResponseHandling:
    """Test error handling and responses."""

    def test_404_handling(self, test_client: TestClient):
        """Test 404 error handling."""
        response = test_client.get("/nonexistent-endpoint")

        assert response.status_code == 404

    def test_method_not_allowed(self, test_client: TestClient):
        """Test method not allowed handling."""
        response = test_client.delete("/")

        assert response.status_code == 405

    def test_validation_error_format(self, test_client: TestClient):
        """Test validation errors are properly formatted."""
        response = test_client.post(
            "/api/complaints",
            json={"invalid_field": "value"},
        )

        # Should return validation error with details
        assert response.status_code in [400, 422]


class TestPerformanceCharacteristics:
    """Test performance-related characteristics."""

    def test_response_time_header(self, test_client: TestClient):
        """Test that response time header is added."""
        response = test_client.get("/health")

        assert "X-Process-Time-Ms" in response.headers

        # Should be a valid float
        time_ms = float(response.headers["X-Process-Time-Ms"])
        assert time_ms >= 0

    def test_concurrent_requests_handled(self, test_client: TestClient):
        """Test that concurrent requests are handled."""
        import concurrent.futures

        def make_request():
            return test_client.get("/health")

        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in futures]

        # All should succeed
        assert all(r.status_code == 200 for r in results)


@pytest.mark.asyncio
class TestAsyncOperations:
    """Test async operations."""

    async def test_async_client_health_check(self, async_client: AsyncClient):
        """Test health check with async client."""
        response = await async_client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data

    async def test_async_complaint_submission(self, async_client: AsyncClient):
        """Test complaint submission with async client."""
        response = await async_client.post(
            "/api/complaints",
            json={
                "text": "Test complaint from async test",
                "channel": "test",
            },
        )

        assert response.status_code in [200, 201, 503]
