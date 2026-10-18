"""Complaint classification via Laya API.

Routes classified complaints to the backend for processing.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from bot.config import get_bot_settings

logger = logging.getLogger("civicflow.bot.classifier")


class LayaClassifier:
    """Client for Laya classification API."""

    def __init__(self, api_url: str | None = None):
        """Initialize the classifier client."""
        settings = get_bot_settings()
        self.api_url = api_url or settings.civicflow_api_url
        self._client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()

    async def classify(
        self,
        text: str,
        keywords: dict[str, list[str]] | None = None,
        location: str | None = None,
        urgency_hint: int | None = None,
    ) -> dict[str, Any]:
        """Classify a complaint using Laya.

        Args:
            text: Complaint text
            keywords: Extracted keywords by category
            location: Optional location
            urgency_hint: Optional urgency level hint (0-2)

        Returns:
            Classification result with department, authority, urgency, etc.
        """
        url = f"{self.api_url}/api/v1/classify"

        payload = {
            "text": text,
            "channel": "telegram",
        }

        if location:
            payload["location"] = location

        try:
            response = await self._client.post(url, json=payload)
            response.raise_for_status()

            result = response.json()
            classification = result.get("classification", {})

            # Override urgency if hint provided
            if urgency_hint is not None:
                classification["urgency"] = urgency_hint

            logger.info(
                "Classification: dept=%s auth=%s urgency=%d conf=%.2f",
                classification.get("department"),
                classification.get("authority"),
                classification.get("urgency"),
                classification.get("confidence", 0),
            )

            return {
                "department": classification.get("department", "roads"),
                "authority": classification.get("authority", "BBMP"),
                "urgency": classification.get("urgency", 1),
                "confidence": classification.get("confidence", 0.5),
                "safety_hazard": classification.get("safety_hazard", False),
                "requires_inspection": classification.get("requires_inspection", True),
                "model": classification.get("model", "fallback"),
                "mode": classification.get("mode", "fallback"),
                "pii_detected": result.get("pii", {}).get("detected", False),
            }

        except httpx.HTTPStatusError as exc:
            logger.error("Classification API error: %s", exc.response.status_code)
            # Return fallback classification
            return self._fallback_classify(text, keywords, urgency_hint)

        except Exception as exc:
            logger.error("Classification failed: %s", exc)
            return self._fallback_classify(text, keywords, urgency_hint)

    def _fallback_classify(
        self,
        text: str,
        keywords: dict[str, list[str]] | None,
        urgency_hint: int | None = None,
    ) -> dict[str, Any]:
        """Fallback rule-based classification.

        Args:
            text: Complaint text
            keywords: Extracted keywords
            urgency_hint: Urgency level hint

        Returns:
            Classification result
        """
        # Determine department from keywords
        if keywords:
            dept_scores = {dept: len(kws) for dept, kws in keywords.items()}
            department = max(dept_scores.keys(), key=lambda d: dept_scores[d])
        else:
            department = "roads"

        # Map department to authority
        dept_to_auth = {
            "roads": "BBMP",
            "sanitation": "BBMP",
            "water": "BWSSB",
            "electricity": "BESCOM",
            "transport": "BMTC",
            "housing": "BBMP",
            "planning": "BDA",
        }
        authority = dept_to_auth.get(department, "BBMP")

        return {
            "department": department,
            "authority": authority,
            "urgency": urgency_hint if urgency_hint is not None else 1,
            "confidence": 0.6,
            "safety_hazard": False,
            "requires_inspection": True,
            "model": "fallback",
            "mode": "fallback",
            "pii_detected": False,
        }

    async def submit_complaint(
        self,
        text: str,
        classification: dict[str, Any],
        user_id: str,
        location: str | None = None,
    ) -> dict[str, Any]:
        """Submit a classified complaint to the backend.

        Args:
            text: Complaint text
            classification: Classification result
            user_id: Telegram user ID
            location: Optional location

        Returns:
            Submission result with complaint ID
        """
        url = f"{self.api_url}/api/v1/complaints"

        payload = {
            "channel": "telegram",
            "text": text,
        }

        if location:
            payload["location"] = location

        try:
            # Submit as form data (multipart)
            form_data = {
                "channel": "telegram",
                "text": text,
            }

            if location:
                form_data["location"] = location

            response = await self._client.post(
                url,
                data=form_data,  # Form data, not JSON
            )
            response.raise_for_status()

            result = response.json()
            logger.info("Complaint submitted: id=%s", result.get("id"))

            return {
                "success": True,
                "complaint_id": result.get("id"),
                "status": result.get("status", "queued"),
            }

        except Exception as exc:
            logger.error("Failed to submit complaint: %s", exc)
            return {
                "success": False,
                "error": str(exc),
            }


# Singleton
_classifier: LayaClassifier | None = None


async def get_classifier() -> LayaClassifier:
    """Get or create the classifier singleton."""
    global _classifier
    if _classifier is None:
        _classifier = LayaClassifier()
    return _classifier


async def close_classifier():
    """Close the classifier client."""
    global _classifier
    if _classifier is not None:
        await _classifier.close()
        _classifier = None
