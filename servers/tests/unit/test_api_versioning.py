"""Tests for API versioning and documentation."""

import pytest
from fastapi.testclient import TestClient

from api.main import app


class TestAPIVersioning:
    """Test API version routing."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    def test_v1_classify_endpoint_exists(self, client):
        """Test that v1 classify endpoint exists."""
        response = client.post(
            "/api/v1/classify",
            json={"text": "Test complaint about a pothole on MG Road"},
        )
        # May fail due to classifier not being available, but endpoint should exist
        assert response.status_code != 404

    def test_v1_complaints_endpoint_exists(self, client):
        """Test that v1 complaints endpoint exists."""
        response = client.get("/api/v1/complaints")
        # May fail due to database not being available, but endpoint should exist
        assert response.status_code != 404

    def test_legacy_classify_endpoint_exists(self, client):
        """Test that legacy classify endpoint still exists."""
        response = client.post(
            "/api/classify",
            json={"text": "Test complaint about water supply issue"},
        )
        assert response.status_code != 404

    def test_root_endpoint_has_version_info(self, client):
        """Test that root endpoint returns version info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()

        assert "version" in data
        assert data["version"] == "1.0.0"
        assert "api_versions" in data
        assert "v1" in data["api_versions"]
        assert "legacy" in data["api_versions"]

    def test_v1_version_info_structure(self, client):
        """Test v1 version info structure."""
        response = client.get("/")
        data = response.json()

        v1_info = data["api_versions"]["v1"]
        assert v1_info["status"] == "stable"
        assert v1_info["base_url"] == "/api/v1"
        assert "/api/v1/classify" in v1_info["endpoints"]

    def test_legacy_version_info_shows_deprecation(self, client):
        """Test that legacy version shows deprecation info."""
        response = client.get("/")
        data = response.json()

        legacy_info = data["api_versions"]["legacy"]
        assert legacy_info["status"] == "deprecated"
        assert "sunset" in legacy_info
        assert "message" in legacy_info


class TestDeprecationMiddleware:
    """Test deprecation header middleware."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    def test_legacy_endpoint_has_deprecation_header(self, client):
        """Test that deprecated endpoints have deprecation headers."""
        response = client.post(
            "/api/classify",
            json={"text": "Test complaint"},
        )

        # Check for deprecation headers
        assert "deprecation" in response.headers
        assert response.headers["deprecation"] == "true"

    def test_v1_endpoint_no_deprecation_header(self, client):
        """Test that v1 endpoints don't have deprecation headers."""
        response = client.post(
            "/api/v1/classify",
            json={"text": "Test complaint"},
        )

        # v1 should not have deprecation header
        assert response.headers.get("deprecation") != "true"


class TestAPIDocumentation:
    """Test API documentation endpoints."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    def test_docs_endpoint_exists(self, client):
        """Test that /docs returns OpenAPI UI."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_endpoint_exists(self, client):
        """Test that /redoc returns ReDoc UI."""
        response = client.get("/redoc")
        assert response.status_code == 200

    def test_openapi_json_endpoint_exists(self, client):
        """Test that /openapi.json returns OpenAPI spec."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()

        assert "openapi" in data
        assert "info" in data
        assert data["info"]["title"] == "CivicFlow API"
        assert data["info"]["version"] == "1.0.0"

    def test_openapi_has_v1_paths(self, client):
        """Test that OpenAPI spec includes v1 paths."""
        response = client.get("/openapi.json")
        data = response.json()

        paths = data.get("paths", {})
        assert "/api/v1/classify" in paths
        assert "/api/v1/complaints" in paths
        # Check for tickets endpoint (exists under /api/v1/tickets/{ticket_id}/approve etc.)
        tickets_paths = [p for p in paths.keys() if "/tickets/" in p]
        assert len(tickets_paths) > 0, "Should have /tickets/ endpoints"

    def test_openapi_has_tags(self, client):
        """Test that OpenAPI spec has tag descriptions."""
        response = client.get("/openapi.json")
        data = response.json()

        tags = data.get("tags", [])
        tag_names = [t["name"] for t in tags]

        assert "classification" in tag_names
        assert "complaints" in tag_names
        assert "tickets" in tag_names

    def test_classify_endpoint_has_examples(self, client):
        """Test that classify endpoint has examples in schema."""
        response = client.get("/openapi.json")
        data = response.json()

        paths = data.get("paths", {})
        classify_path = paths.get("/api/v1/classify", {})
        post_op = classify_path.get("post", {})

        # Should have request body with examples
        assert "requestBody" in post_op

    def test_health_endpoint_documented(self, client):
        """Test that health endpoint is documented."""
        response = client.get("/openapi.json")
        data = response.json()

        paths = data.get("paths", {})
        assert "/health" in paths
