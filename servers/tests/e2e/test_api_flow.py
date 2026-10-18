"""End-to-End API Flow Tests - Complete Citizen Complaint Journey.

This module tests the complete flow of citizen complaint submission,
classification, storage, and retrieval using the /api/classify endpoint.
"""

import asyncio
import time
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient


# ── Test Data ──

REALISTIC_COMPLAINTS = [
    {
        "category": "roads",
        "text": "There is a large pothole on MG Road near Trinity Metro station. "
                "It's been there for 2 weeks and is causing traffic jams during peak hours. "
                "Several vehicles have been damaged. Location: MG Road, opposite UB City.",
        "expected_department": "roads",
        "expected_authority": "BBMP",
        "expected_urgency_min": 1,
    },
    {
        "category": "water",
        "text": "No water supply in Koramangala 4th block for the past 4 days. "
                "BWSSB helpline is not responding. Multiple complaints filed but no action taken. "
                "We are dependent on water tankers. Please help urgently.",
        "expected_department": "water",
        "expected_authority": "BWSSB",
        "expected_urgency_min": 1,
    },
    {
        "category": "electricity_emergency",
        "text": "DANGER! Exposed live electrical wire hanging from a pole on 12th Main Road, "
                "Indiranagar. School children pass by this area. Risk of electrocution! "
                "BESCOM needs to attend immediately. This is a safety emergency!",
        "expected_department": "electricity",
        "expected_authority": "BESCOM",
        "expected_urgency_min": 2,  # High urgency due to "DANGER" and safety risk
    },
    {
        "category": "sanitation",
        "text": "Garbage not collected in JP Nagar 7th phase for over 10 days. "
                "The pile is overflowing and causing terrible smell. "
                "Mosquitoes and stray dogs are spreading the garbage around. "
                "Please arrange for immediate cleanup.",
        "expected_department": "sanitation",
        "expected_authority": "BBMP",
        "expected_urgency_min": 1,
    },
    {
        "category": "transport",
        "text": "BMTC bus route 335E is always late. The bus stop at Electronic City Phase 1 "
                "has no shelter and commuters suffer in rain and sun. "
                "Need better frequency and a proper bus shelter.",
        "expected_department": "transport",
        "expected_authority": "BMTC",
        "expected_urgency_min": 0,  # Might be low urgency
    },
]


# ── Synchronous E2E Tests ──

class TestAPIHealthEndpoints:
    """Test API health and meta endpoints."""

    def test_root_returns_api_info(self, test_client: TestClient):
        """Root endpoint should return API metadata."""
        response = test_client.get("/")

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == "CivicFlow API"
        assert "version" in data
        assert data["docs"] == "/docs"

    def test_health_returns_service_status(self, test_client: TestClient):
        """Health endpoint should show all service statuses."""
        response = test_client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # Required fields
        assert "status" in data
        assert "checks" in data
        assert "version" in data

        # Check structure
        assert "database" in data["checks"]
        assert "redis" in data["checks"]
        assert "classifier" in data["checks"]
        assert "minio" in data["checks"]

    def test_health_includes_circuit_breaker_stats(self, test_client: TestClient):
        """Health endpoint should include circuit breaker statistics."""
        response = test_client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # Circuit breakers should be tracked
        assert "circuit_breakers" in data
        assert isinstance(data["circuit_breakers"], dict)

    def test_metrics_endpoint_returns_prometheus_format(self, test_client: TestClient):
        """Metrics endpoint should return Prometheus-compatible metrics."""
        response = test_client.get("/metrics")

        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]

        # Should contain our metric prefix
        content = response.content.decode()
        assert "civicflow_" in content

    def test_openapi_docs_available(self, test_client: TestClient):
        """OpenAPI documentation should be available."""
        response = test_client.get("/docs")
        assert response.status_code == 200

    def test_openapi_json_spec(self, test_client: TestClient):
        """OpenAPI JSON spec should be valid."""
        response = test_client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()

        assert "openapi" in data
        assert "paths" in data
        assert "/health" in data["paths"]


class TestClassificationE2E:
    """End-to-end classification tests using /api/classify endpoint."""

    def test_classify_complaint_basic(self, test_client: TestClient):
        """Test basic complaint classification."""
        response = test_client.post(
            "/api/classify",
            json={
                "text": "Test pothole on Test Road",
                "channel": "api_test",
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Should have classification
        assert "classification" in data
        classification = data["classification"]

        # Verify classification structure
        assert classification["department"] in [
            "roads", "water", "sanitation", "electricity",
            "transport", "housing", "planning"
        ]
        assert classification["authority"] in [
            "BBMP", "BWSSB", "BESCOM", "BMTC", "BDA",
            "GBA", "BMRDA", "KSDB", "BEML"
        ]
        assert classification["urgency"] in [0, 1, 2]
        assert 0.0 <= classification["confidence"] <= 1.0

    def test_classify_with_location_and_user(self, test_client: TestClient):
        """Test classification with location and user metadata."""
        response = test_client.post(
            "/api/classify",
            json={
                "text": "Water leakage on 5th Cross, Indiranagar",
                "channel": "telegram",
                "location": "5th Cross, Indiranagar, Bengaluru 560038",
                "user_id": "telegram_user_12345",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "classification" in data

    def test_classify_with_pii(self, test_client: TestClient):
        """Test that complaints with PII are handled securely."""
        response = test_client.post(
            "/api/classify",
            json={
                "text": "My name is Ramesh Kumar. Phone: 9876543210. "
                        "There's a garbage pile near my house at 123, MG Road.",
                "channel": "api_test",
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Should indicate PII was detected
        assert data["pii_detected"] is True
        assert "phone" in data["pii_types"]

        # Redacted text should not contain raw PII
        if data["redacted_text"]:
            assert "9876543210" not in data["redacted_text"]


class TestMultipleClassificationsE2E:
    """Test classifying multiple complaints for different categories."""

    @pytest.mark.parametrize("complaint", REALISTIC_COMPLAINTS)
    def test_classify_realistic_complaint(self, test_client: TestClient, complaint: dict):
        """Test classification of realistic complaint scenarios."""
        response = test_client.post(
            "/api/classify",
            json={
                "text": complaint["text"],
                "channel": "e2e_test",
            },
        )

        assert response.status_code == 200, \
            f"Failed for {complaint['category']}: {response.text}"

        data = response.json()
        classification = data.get("classification", {})

        # Verify classification
        assert classification["department"] == complaint["expected_department"], \
            f"Dept mismatch for {complaint['category']}: got {classification['department']}"

        assert classification["authority"] == complaint["expected_authority"], \
            f"Authority mismatch for {complaint['category']}: got {classification['authority']}"

        assert classification["urgency"] >= complaint["expected_urgency_min"], \
            f"Urgency too low for {complaint['category']}: got {classification['urgency']}"


class TestBatchClassificationE2E:
    """Test batch classification endpoint."""

    def test_batch_classify(self, test_client: TestClient):
        """Test batch classification of multiple complaints."""
        complaints = [
            {"text": "Pothole on MG Road", "channel": "batch_test"},
            {"text": "Water supply issue in Koramangala", "channel": "batch_test"},
            {"text": "Power outage in Indiranagar", "channel": "batch_test"},
        ]

        response = test_client.post(
            "/api/classify/batch",
            json=complaints,
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 3
        for result in data:
            assert "classification" in result
            assert "department" in result["classification"]

    def test_batch_too_large(self, test_client: TestClient):
        """Test batch endpoint rejects large batches."""
        complaints = [
            {"text": f"Complaint {i}", "channel": "test"}
            for i in range(51)  # Max is 50
        ]

        response = test_client.post(
            "/api/classify/batch",
            json=complaints,
        )

        assert response.status_code == 400


class TestPerformanceCharacteristics:
    """Test performance characteristics of the API."""

    def test_response_time_header_present(self, test_client: TestClient):
        """All responses should include process time header."""
        response = test_client.get("/health")

        assert "X-Process-Time-Ms" in response.headers

        time_ms = float(response.headers["X-Process-Time-Ms"])
        assert time_ms >= 0

    def test_health_endpoint_is_fast(self, test_client: TestClient):
        """Health check should complete reasonably fast.

        Note: When external services (ClickHouse, MinIO, Redis) are not running,
        health checks take longer due to connection timeouts. This test accounts
        for that by using a more lenient threshold.
        """
        times = []

        for _ in range(5):
            start = time.perf_counter()
            response = test_client.get("/health")
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)

        avg_time = sum(times) / len(times)

        assert response.status_code == 200
        # Use 10 second threshold when services may not be running (connection timeouts)
        # In production with all services healthy, this should be < 200ms
        assert avg_time < 10000, f"Health check too slow: {avg_time:.1f}ms average"

    def test_classification_latency_reasonable(self, test_client: TestClient):
        """Classification should complete in reasonable time."""
        response = test_client.post(
            "/api/classify",
            json={
                "text": "Test pothole classification latency",
                "channel": "perf_test",
            },
        )

        assert response.status_code == 200

        if "X-Process-Time-Ms" in response.headers:
            time_ms = float(response.headers["X-Process-Time-Ms"])
            # Classification with fallback should be very fast
            assert time_ms < 1000, f"Classification too slow: {time_ms:.0f}ms"


# ── Async E2E Tests ──

@pytest.mark.asyncio
class TestAsyncAPIFlows:
    """Test API using async client."""

    async def test_async_health_check(self, async_client: AsyncClient):
        """Test health check with async client."""
        response = await async_client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data

    async def test_async_classification(self, async_client: AsyncClient):
        """Test classification with async client."""
        response = await async_client.post(
            "/api/classify",
            json={
                "text": "Async test complaint about street lights",
                "channel": "async_test",
            },
        )

        assert response.status_code == 200

    async def test_concurrent_classifications(self, async_client: AsyncClient):
        """Test handling multiple concurrent classifications."""
        complaints = [
            {"text": f"Concurrent complaint {i}", "channel": "concurrent_test"}
            for i in range(5)
        ]

        # Submit all concurrently
        tasks = [
            async_client.post("/api/classify", json=complaint)
            for complaint in complaints
        ]

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # All should complete (even if some fail due to load)
        success_count = sum(
            1 for r in responses
            if not isinstance(r, Exception) and r.status_code == 200
        )

        # At least some should succeed
        assert success_count >= 3, f"Too many failures: {responses}"


# ── Error Handling Tests ──

class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_404_on_unknown_endpoint(self, test_client: TestClient):
        """Unknown endpoints should return 404."""
        response = test_client.get("/nonexistent")

        assert response.status_code == 404

    def test_validation_error_on_missing_text(self, test_client: TestClient):
        """Missing required fields should return validation error."""
        response = test_client.post(
            "/api/classify",
            json={"channel": "test"},  # Missing 'text'
        )

        assert response.status_code == 422

    def test_validation_error_on_short_text(self, test_client: TestClient):
        """Text that is too short should be rejected."""
        response = test_client.post(
            "/api/classify",
            json={"text": "short", "channel": "test"},  # Less than 10 chars
        )

        assert response.status_code == 422

    def test_method_not_allowed(self, test_client: TestClient):
        """Wrong HTTP method should return 405."""
        response = test_client.delete("/health")

        assert response.status_code == 405
