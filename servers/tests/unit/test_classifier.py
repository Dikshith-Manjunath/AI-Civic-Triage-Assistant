"""Unit tests for the Laya classifier service."""

import pytest
from api.services.classifier import (
    classify_complaint,
    _fallback_classify,
    CIVIC_QUESTIONS,
)


class TestClassifierSchema:
    """Test the civic classification question schema."""

    def test_civic_questions_has_required_fields(self):
        """Verify all required question types exist."""
        assert "department" in CIVIC_QUESTIONS
        assert "authority" in CIVIC_QUESTIONS
        assert "urgency" in CIVIC_QUESTIONS
        assert "safety_hazard" in CIVIC_QUESTIONS
        assert "requires_inspection" in CIVIC_QUESTIONS

    def test_department_has_all_categories(self):
        """Verify all department categories are defined."""
        dept = CIVIC_QUESTIONS["department"]
        assert dept["type"] == "choice"
        criteria = dept["criteria"]

        expected_depts = {"roads", "sanitation", "water", "electricity", "transport", "housing", "planning"}
        assert expected_depts <= set(criteria.keys())

    def test_authority_has_bengaluru_agencies(self):
        """Verify Bengaluru civic authorities are defined."""
        auth = CIVIC_QUESTIONS["authority"]
        assert auth["type"] == "choice"
        criteria = auth["criteria"]

        expected_auths = {"BBMP", "BWSSB", "BESCOM", "BMTC", "BDA"}
        assert expected_auths <= set(criteria.keys())


class TestFallbackClassifier:
    """Test the rule-based fallback classifier."""

    def test_roads_classification(self, mock_complaint_text):
        """Test roads department classification."""
        result = _fallback_classify(mock_complaint_text)

        assert result["department"] == "roads"
        assert result["authority"] == "BBMP"
        assert result["urgency"] >= 1  # At least medium
        assert result["confidence"] >= 0.5
        assert result["mode"] == "fallback"

    def test_water_classification(self, mock_complaint_water):
        """Test water department classification."""
        result = _fallback_classify(mock_complaint_water)

        assert result["department"] == "water"
        assert result["authority"] == "BWSSB"
        assert result["urgency"] >= 1

    def test_electricity_classification(self, mock_complaint_electricity):
        """Test electricity department classification."""
        result = _fallback_classify(mock_complaint_electricity)

        assert result["department"] == "electricity"
        assert result["authority"] == "BESCOM"

    def test_urgency_detection_high(self):
        """Test high urgency detection."""
        text = "Danger! Large tree about to collapse on the road, could cause accidents anytime!"
        result = _fallback_classify(text)

        assert result["urgency"] == 2  # High
        assert result["safety_hazard"] is True

    def test_urgency_detection_low(self):
        """Test low urgency detection."""
        text = "Minor aesthetic issue with the park bench paint - suggestion to repaint."
        result = _fallback_classify(text)

        assert result["urgency"] == 0  # Low

    def test_fallback_returns_complete_structure(self, mock_complaint_text):
        """Test that fallback returns all required fields."""
        result = _fallback_classify(mock_complaint_text)

        required_fields = [
            "department",
            "authority",
            "urgency",
            "confidence",
            "safety_hazard",
            "safety_hazard_probability",
            "requires_inspection",
            "requires_inspection_probability",
            "model",
            "mode",
        ]

        for field in required_fields:
            assert field in result, f"Missing field: {field}"

    def test_multilingual_text_handling(self):
        """Test that multilingual text doesn't crash the fallback."""
        texts = [
            "ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಹೊಂಡವಿದೆ",  # Kannada: Large pothole on road
            "सड़क पर बड़ा गड्ढा है",  # Hindi: Large pothole on road
            "சாலையில் பெரிய குழி உள்ளது",  # Tamil: Large pothole on road
        ]

        for text in texts:
            result = _fallback_classify(text)
            # Should not crash, should return valid classification
            assert "department" in result
            assert "authority" in result
            assert isinstance(result["urgency"], int)


@pytest.mark.asyncio
class TestClassifierIntegration:
    """Integration tests for the classifier with fallback."""

    async def test_classify_complaint_uses_fallback_when_no_laya(self, mock_complaint_text):
        """Test that classification falls back gracefully."""
        result = await classify_complaint(mock_complaint_text, channel="test")

        # Should succeed even without Laya
        assert result["department"] in ["roads", "water", "sanitation", "electricity", "transport", "housing", "planning"]
        assert result["authority"] in ["BBMP", "BWSSB", "BESCOM", "BMTC", "BDA", "GBA", "BMRDA", "KSDB", "BEML"]
        assert result["urgency"] in [0, 1, 2]

    async def test_classify_with_metadata(self, mock_complaint_text):
        """Test classification with metadata."""
        metadata = {
            "channel": "telegram",
            "user_id": "test_user_123",
            "location": "MG Road, Bengaluru",
        }

        result = await classify_complaint(mock_complaint_text, metadata=metadata, channel="telegram")

        assert "department" in result
        assert "authority" in result
