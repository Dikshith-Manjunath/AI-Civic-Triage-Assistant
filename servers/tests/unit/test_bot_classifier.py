"""Tests for Laya classifier client."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from bot.classifier import LayaClassifier


class TestLayaClassifier:
    """Test classifier client."""

    def test_initialization(self):
        """Test classifier initialization."""
        classifier = LayaClassifier(api_url="http://localhost:8000")

        assert classifier.api_url == "http://localhost:8000"

    @pytest.mark.asyncio
    async def test_classify_success(self):
        """Test successful classification."""
        classifier = LayaClassifier(api_url="http://localhost:8000")

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "classification": {
                "department": "roads",
                "authority": "BBMP",
                "urgency": 2,
                "confidence": 0.92,
                "safety_hazard": True,
                "requires_inspection": True,
                "model": "multilingual",
                "mode": "sdk",
            },
            "pii": {"detected": False},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(classifier._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await classifier.classify(
                text="Large pothole on MG Road",
                keywords={"roads": ["pothole"]},
            )

            assert result["department"] == "roads"
            assert result["authority"] == "BBMP"
            assert result["urgency"] == 2
            assert result["confidence"] == 0.92
            assert not result["pii_detected"]

    @pytest.mark.asyncio
    async def test_classify_with_urgency_override(self):
        """Test classification with urgency override."""
        classifier = LayaClassifier(api_url="http://localhost:8000")

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "classification": {
                "department": "electricity",
                "authority": "BESCOM",
                "urgency": 1,
                "confidence": 0.85,
            },
            "pii": {"detected": False},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(classifier._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            # Override urgency to 2
            result = await classifier.classify(
                text="Power outage",
                urgency_hint=2,
            )

            assert result["urgency"] == 2  # Overridden

    @pytest.mark.asyncio
    async def test_classify_fallback_on_error(self):
        """Test fallback classification on API error."""
        classifier = LayaClassifier(api_url="http://localhost:8000")

        with patch.object(classifier._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = Exception("API error")

            result = await classifier.classify(
                text="Water supply issue",
                keywords={"water": ["water", "supply"]},
            )

            # Should use fallback
            assert result["department"] == "water"
            assert result["authority"] == "BWSSB"
            assert result["model"] == "fallback"

    def test_fallback_classify(self):
        """Test internal fallback classification logic."""
        classifier = LayaClassifier()

        result = classifier._fallback_classify(
            text="Pothole on the road",
            keywords={"roads": ["pothole", "road"]},
            urgency_hint=2,
        )

        assert result["department"] == "roads"
        assert result["authority"] == "BBMP"
        assert result["urgency"] == 2
        assert result["confidence"] == 0.6
        assert result["model"] == "fallback"

    def test_fallback_classify_no_keywords(self):
        """Test fallback with no keywords."""
        classifier = LayaClassifier()

        result = classifier._fallback_classify(
            text="Something is wrong",
            keywords=None,
            urgency_hint=1,
        )

        # Should default to roads
        assert result["department"] == "roads"
        assert result["urgency"] == 1

    @pytest.mark.asyncio
    async def test_submit_complaint_success(self):
        """Test successful complaint submission."""
        classifier = LayaClassifier(api_url="http://localhost:8000")

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "id": "test-complaint-123",
            "status": "queued",
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(classifier._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await classifier.submit_complaint(
                text="Test complaint",
                classification={"department": "roads"},
                user_id="telegram_123",
            )

            assert result["success"]
            assert result["complaint_id"] == "test-complaint-123"

    @pytest.mark.asyncio
    async def test_submit_complaint_failure(self):
        """Test complaint submission failure."""
        classifier = LayaClassifier(api_url="http://localhost:8000")

        with patch.object(classifier._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = Exception("Submission failed")

            result = await classifier.submit_complaint(
                text="Test complaint",
                classification={"department": "roads"},
                user_id="telegram_123",
            )

            assert not result["success"]
            assert "error" in result
