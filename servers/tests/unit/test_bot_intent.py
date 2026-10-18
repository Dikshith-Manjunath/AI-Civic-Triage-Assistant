"""Tests for bot intent analysis."""

import pytest

from bot.intent import IntentAnalyzer, get_intent_analyzer
from bot.prompts import CIVIC_KEYWORDS, STRESS_INDICATORS


class TestIntentAnalyzer:
    """Test intent analyzer."""

    def test_extract_keywords_roads(self):
        """Test keyword extraction for roads."""
        analyzer = IntentAnalyzer()

        text = "There's a large pothole on MG Road causing traffic issues"
        keywords = analyzer.extract_keywords(text)

        assert "roads" in keywords
        assert any("pothole" in kw.lower() for kw in keywords["roads"])

    def test_extract_keywords_water(self):
        """Test keyword extraction for water."""
        analyzer = IntentAnalyzer()

        text = "No water supply for 3 days, pipes are leaking"
        keywords = analyzer.extract_keywords(text)

        assert "water" in keywords
        assert any("water" in kw.lower() for kw in keywords["water"])

    def test_extract_keywords_multiple_categories(self):
        """Test extraction with multiple categories."""
        analyzer = IntentAnalyzer()

        text = "Street light not working and there's garbage on the road"
        keywords = analyzer.extract_keywords(text)

        # Should have both roads (street light) and sanitation (garbage)
        assert "roads" in keywords or "sanitation" in keywords

    def test_detect_emotional_state_calm(self):
        """Test calm state detection."""
        analyzer = IntentAnalyzer()

        text = "There's a small pothole near my house"
        emotional = analyzer.detect_emotional_state(text)

        assert emotional["emotional_state"] == "calm"
        assert not emotional["is_stressed"]
        assert not emotional["is_urgent"]

    def test_detect_emotional_state_frustrated(self):
        """Test frustrated state detection."""
        analyzer = IntentAnalyzer()

        text = "I'm so frustrated! The water supply is terrible and it's upsetting"
        emotional = analyzer.detect_emotional_state(text)

        assert emotional["emotional_state"] in ("frustrated", "stressed")
        assert emotional["is_stressed"]

    def test_detect_emotional_state_urgent(self):
        """Test urgent state detection."""
        analyzer = IntentAnalyzer()

        text = "EMERGENCY! There's a dangerous electrical wire hanging that could cause an accident!"
        emotional = analyzer.detect_emotional_state(text)

        assert emotional["is_urgent"]
        assert emotional["emotional_state"] == "urgent"

    def test_get_urgency_level(self):
        """Test urgency level determination."""
        analyzer = IntentAnalyzer()

        # Urgent
        analysis = {"is_urgent": True, "emotional_state": "urgent"}
        assert analyzer.get_urgency_level(analysis) == 2

        # Stressed
        analysis = {"is_urgent": False, "is_stressed": True, "emotional_state": "frustrated"}
        assert analyzer.get_urgency_level(analysis) == 1

        # Calm
        analysis = {"is_urgent": False, "is_stressed": False, "emotional_state": "calm"}
        assert analyzer.get_urgency_level(analysis) == 0

    def test_singleton(self):
        """Test singleton pattern."""
        a1 = get_intent_analyzer()
        a2 = get_intent_analyzer()

        assert a1 is a2


class TestKeywordPatterns:
    """Test keyword pattern compilation."""

    def test_all_categories_have_keywords(self):
        """Test that all categories have keywords defined."""
        assert len(CIVIC_KEYWORDS) >= 7  # At least 7 departments

        for category, keywords in CIVIC_KEYWORDS.items():
            assert len(keywords) > 0, f"No keywords for {category}"

    def test_stress_indicators_defined(self):
        """Test stress indicators are defined."""
        assert len(STRESS_INDICATORS) > 0
        assert "frustrated" in STRESS_INDICATORS
        assert "urgent" in STRESS_INDICATORS
