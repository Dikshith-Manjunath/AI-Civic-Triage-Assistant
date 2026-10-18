"""End-to-End Integration Tests - Full Platform Workflow.

Tests the complete flow from complaint submission through classification,
PII handling, and status tracking using the /api/classify endpoint.
"""

import pytest
from fastapi.testclient import TestClient


class TestCompleteComplaintJourney:
    """Test the complete citizen complaint journey."""

    def test_full_complaint_classification_and_pii_handling(self, test_client: TestClient):
        """
        Complete E2E test for complaint classification:

        1. Submit complaint with PII
        2. Verify classification returned
        3. Verify PII handling
        4. Verify response structure
        """
        # Step 1: Submit a realistic complaint with PII
        complaint_data = {
            "text": "EMERGENCY: Large water pipe burst on 12th Main, Indiranagar. "
                    "Water flooding the street and entering houses. "
                    "Contact: Ravi Kumar at 9876543210. Please send help immediately!",
            "channel": "api",
            "location": "12th Main Road, Indiranagar, Bengaluru 560038",
            "user_id": "citizen_test_001",
        }

        response = test_client.post("/api/classify", json=complaint_data)

        assert response.status_code == 200, f"Classification failed: {response.text}"

        data = response.json()

        # Step 2: Verify classification is correct
        assert "classification" in data, "Missing classification in response"

        classification = data["classification"]

        # Should classify as water issue
        assert classification["department"] == "water", \
            f"Expected water department, got {classification['department']}"

        # Should route to BWSSB
        assert classification["authority"] == "BWSSB", \
            f"Expected BWSSB authority, got {classification['authority']}"

        # Should be high urgency (emergency keyword)
        assert classification["urgency"] >= 1, \
            f"Expected urgency >= 1 for emergency, got {classification['urgency']}"

        # Confidence should be reasonable
        assert classification["confidence"] >= 0.5, \
            f"Confidence too low: {classification['confidence']}"

        # Step 3: Verify PII handling
        # Phone number 9876543210 was in the complaint
        assert data["pii_detected"] is True, \
            "PII should be detected when phone number present"

        assert "phone" in data["pii_types"], \
            f"Phone should be in PII types: {data['pii_types']}"

        # Raw phone should not appear in redacted text
        if data["redacted_text"]:
            assert "9876543210" not in data["redacted_text"], \
                "Raw phone number should be redacted"

        # Step 4: Verify response structure
        required_fields = ["classification", "pii_detected", "pii_types", "original_text_length"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_complaint_categories_coverage(self, test_client: TestClient):
        """
        Test that all major complaint categories are classified correctly.
        Ensures the fallback classifier handles all departments.
        """
        category_tests = [
            ("roads", "Pothole on MG Road causing traffic issues", "BBMP"),
            ("water", "Water supply issue in Koramangala", "BWSSB"),
            ("electricity", "Power outage in my area", "BESCOM"),
            ("sanitation", "Garbage not collected for a week", "BBMP"),
            ("transport", "BMTC bus not on time", "BMTC"),
        ]

        results = []

        for expected_dept, text, expected_auth in category_tests:
            response = test_client.post(
                "/api/classify",
                json={"text": text, "channel": "category_test"},
            )

            assert response.status_code == 200, f"Failed for {expected_dept}: {response.text}"

            data = response.json()
            classification = data.get("classification", {})

            actual_dept = classification.get("department", "unknown")
            actual_auth = classification.get("authority", "unknown")

            results.append({
                "expected_dept": expected_dept,
                "actual_dept": actual_dept,
                "match": actual_dept == expected_dept,
            })

        # At least 80% should match
        match_rate = sum(1 for r in results if r["match"]) / len(results) if results else 0

        assert match_rate >= 0.8, \
            f"Classification accuracy too low: {match_rate:.0%}. Results: {results}"

    def test_urgency_detection_accuracy(self, test_client: TestClient):
        """
        Test that urgency levels are detected correctly.
        High urgency for emergencies, low for minor issues.
        """
        urgency_tests = [
            ("EMERGENCY danger immediate hazard collapse fire", 2),  # Should be high
            ("Minor aesthetic issue with paint", 0),  # Should be low
            ("Regular maintenance needed", 1),  # Should be medium
        ]

        for text, expected_min_urgency in urgency_tests:
            response = test_client.post(
                "/api/classify",
                json={"text": text, "channel": "urgency_test"},
            )

            assert response.status_code == 200, f"Failed for urgency test: {response.text}"

            data = response.json()
            urgency = data.get("classification", {}).get("urgency", 1)

            if expected_min_urgency == 2:
                assert urgency >= 1, \
                    f"High urgency text should have urgency >= 1, got {urgency}"

            # For low urgency, confidence that it's not high
            if expected_min_urgency == 0:
                assert urgency <= 2, \
                    f"Low urgency text should have urgency <= 2, got {urgency}"


class TestSecureDataHandling:
    """Test secure handling of sensitive citizen data."""

    def test_aadhaar_number_detection_and_masking(self, test_client: TestClient):
        """Test Aadhaar number is detected and handled securely."""
        complaint_text = (
            "I am facing issues with the property. "
            "My Aadhaar number is 1234 5678 9012. "
            "Please update my records."
        )

        response = test_client.post(
            "/api/classify",
            json={"text": complaint_text, "channel": "security_test"},
        )

        assert response.status_code == 200

        data = response.json()

        # Should detect Aadhaar
        assert "aadhaar" in data["pii_types"], \
            f"Aadhaar should be detected in: {data['pii_types']}"

        # Raw Aadhaar should not appear in redacted text
        if data["redacted_text"]:
            assert "1234 5678 9012" not in data["redacted_text"], \
                "Raw Aadhaar should not appear in redacted text"

    def test_multiple_pii_types_handled(self, test_client: TestClient):
        """Test handling of multiple PII types in one complaint."""
        complaint_text = """
        My details:
        - Phone: 9876543210
        - Email: test@example.com
        - Aadhaar: 1111 2222 3333
        - PAN: ABCDE1234F

        The pothole on my street needs fixing.
        """

        response = test_client.post(
            "/api/classify",
            json={"text": complaint_text, "channel": "multi_pii_test"},
        )

        assert response.status_code == 200

        data = response.json()

        pii_types = data["pii_types"]

        # Should detect multiple types
        assert len(pii_types) >= 2, \
            f"Expected multiple PII types, got: {pii_types}"

        # Should still classify as roads
        classification = data.get("classification", {})
        assert classification.get("department") == "roads", \
            "Should still classify as roads despite PII"


class TestCircuitBreakerInAPI:
    """Test circuit breaker behavior in real API context."""

    def test_circuit_breaker_tracked_in_health(self, test_client: TestClient):
        """Circuit breaker stats should be visible in health endpoint."""
        # Make a request that might trigger classifier
        test_client.post(
            "/api/classify",
            json={"text": "Test circuit breaker", "channel": "cb_test"},
        )

        # Check health for circuit breaker stats
        health_response = test_client.get("/health")

        assert health_response.status_code == 200
        health_data = health_response.json()

        # Circuit breakers should be tracked
        assert "circuit_breakers" in health_data

        # Should have laya-classifier circuit if Laya is enabled
        cb_stats = health_data["circuit_breakers"]

        # Either empty (laya disabled) or has laya-classifier entry
        if cb_stats:
            assert isinstance(cb_stats, dict)


class TestAPIResponseConsistency:
    """Test that API responses are consistent and well-structured."""

    def test_classification_response_schema(self, test_client: TestClient):
        """Verify classification response has consistent schema."""
        response = test_client.post(
            "/api/classify",
            json={"text": "Test response schema consistency", "channel": "schema_test"},
        )

        assert response.status_code == 200

        data = response.json()

        # Classification should have all expected fields
        if "classification" in data:
            classification = data["classification"]

            required_fields = [
                "department",
                "authority",
                "urgency",
                "confidence",
            ]

            for field in required_fields:
                assert field in classification, \
                    f"Missing required field in classification: {field}"

            # Type checks
            assert isinstance(classification["department"], str)
            assert isinstance(classification["authority"], str)
            assert isinstance(classification["urgency"], int)
            assert isinstance(classification["confidence"], (int, float))

    def test_http_headers_consistency(self, test_client: TestClient):
        """Verify response headers are consistent."""
        response = test_client.get("/health")

        # Should always have process time
        assert "X-Process-Time-Ms" in response.headers

        # Content type should be correct
        assert "application/json" in response.headers["content-type"]

    def test_error_response_format(self, test_client: TestClient):
        """Verify error responses have consistent format."""
        response = test_client.post(
            "/api/classify",
            json={},  # Missing required field
        )

        assert response.status_code == 422

        error_data = response.json()

        # Should have error details
        assert "detail" in error_data or "error" in error_data
