"""Intent detection and keyword extraction.

Analyzes user messages to determine:
- Intent (submit_complaint, check_status, greeting, off_topic)
- Emotional state (calm, frustrated, stressed, angry, urgent)
- Key information for classification
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from bot.groq_client import get_groq_client
from bot.prompts import CIVIC_KEYWORDS, STRESS_INDICATORS, URGENCY_INDICATORS

logger = logging.getLogger("civicflow.bot.intent")


class IntentAnalyzer:
    """Analyzes user messages for intent and key information."""

    def __init__(self):
        """Initialize the analyzer."""
        self.keyword_patterns = self._compile_keyword_patterns()

    def _compile_keyword_patterns(self) -> dict[str, list[re.Pattern]]:
        """Compile regex patterns for keyword matching."""
        patterns = {}
        for category, keywords in CIVIC_KEYWORDS.items():
            patterns[category] = [
                re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE) for kw in keywords
            ]
        return patterns

    def extract_keywords(self, text: str) -> dict[str, list[str]]:
        """Extract civic-related keywords from text.

        Args:
            text: User message text

        Returns:
            Dict mapping category to matched keywords
        """
        matches: dict[str, list[str]] = {}

        for category, patterns in self.keyword_patterns.items():
            category_matches = []
            for pattern in patterns:
                found = pattern.findall(text)
                category_matches.extend(found)

            if category_matches:
                matches[category] = list(set(category_matches))  # Dedupe

        return matches

    def detect_emotional_state(self, text: str) -> dict[str, Any]:
        """Detect emotional state from text.

        Args:
            text: User message text

        Returns:
            Dict with emotional_state and stress_indicators
        """
        text_lower = text.lower()

        stress_found = []
        for indicator in STRESS_INDICATORS:
            if indicator in text_lower:
                stress_found.append(indicator)

        urgency_found = []
        for indicator in URGENCY_INDICATORS:
            if indicator in text_lower:
                urgency_found.append(indicator)

        # Determine emotional state
        if urgency_found:
            state = "urgent"
        elif len(stress_found) >= 3:
            state = "stressed"
        elif len(stress_found) >= 1:
            state = "frustrated"
        else:
            state = "calm"

        return {
            "emotional_state": state,
            "stress_indicators": stress_found,
            "urgency_indicators": urgency_found,
            "is_urgent": len(urgency_found) > 0,
            "is_stressed": len(stress_found) >= 2,
        }

    async def analyze(self, text: str) -> dict[str, Any]:
        """Full analysis of user message.

        Combines:
        - Keyword extraction
        - Emotional state detection
        - LLM-based intent classification

        Args:
            text: User message text

        Returns:
            Comprehensive analysis dict
        """
        # Fast local analysis
        keywords = self.extract_keywords(text)
        emotional = self.detect_emotional_state(text)

        # Determine likely department
        if keywords:
            # Score by number of keyword matches
            dept_scores = {dept: len(kws) for dept, kws in keywords.items()}
            likely_dept = max(dept_scores.keys(), key=lambda d: dept_scores[d])
        else:
            likely_dept = None

        # Use LLM for intent classification
        try:
            groq = await get_groq_client()
            llm_result = await groq.analyze_intent(text)

            intent = llm_result.get("intent", "unclear")
            confidence = llm_result.get("confidence", 0.5)

        except Exception as exc:
            logger.error("LLM intent analysis failed: %s", exc)
            intent = "submit_complaint" if keywords else "unclear"
            confidence = 0.5 if keywords else 0.3

        return {
            "intent": intent,
            "confidence": confidence,
            "emotional_state": emotional["emotional_state"],
            "is_urgent": emotional["is_urgent"],
            "is_stressed": emotional["is_stressed"],
            "keywords": keywords,
            "likely_department": likely_dept,
            "stress_indicators": emotional["stress_indicators"],
            "urgency_indicators": emotional["urgency_indicators"],
            "location": await self._extract_location(text),
        }

    async def _extract_location(self, text: str) -> str | None:
        """Extract location from text using LLM.

        Args:
            text: User message text

        Returns:
            Extracted location or None
        """
        # Common Bengaluru location patterns
        location_patterns = [
            r"(?:in|at|near|around|on)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:road|street|area|layout|nagar|colony|sector|block))",
            r"([A-Z][a-zA-Z\s]+?\s+(?:Road|Street|Area|Layout|Nagar|Colony|Sector|Block))",
        ]

        for pattern in location_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()

        return None

    def get_urgency_level(self, analysis: dict[str, Any]) -> int:
        """Determine urgency level from analysis.

        Args:
            analysis: Analysis result from analyze()

        Returns:
            Urgency level: 0 (low), 1 (medium), 2 (high)
        """
        if analysis.get("is_urgent"):
            return 2

        if analysis.get("is_stressed"):
            return 1

        emotional_state = analysis.get("emotional_state", "calm")
        if emotional_state in ("urgent", "angry"):
            return 2
        elif emotional_state in ("stressed", "frustrated"):
            return 1

        return 0


# Singleton
_analyzer: IntentAnalyzer | None = None


def get_intent_analyzer() -> IntentAnalyzer:
    """Get or create the intent analyzer singleton."""
    global _analyzer
    if _analyzer is None:
        _analyzer = IntentAnalyzer()
    return _analyzer
