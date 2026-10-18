"""Intent classification for chatbot messages."""

from __future__ import annotations

import logging
import re
from enum import Enum
from typing import Any

logger = logging.getLogger("civicflow.bot.intents")


class Intent(str, Enum):
    """User intent classification."""

    SUBMIT_COMPLAINT = "submit_complaint"
    CHECK_STATUS = "check_status"
    GET_INFO = "get_info"
    GREETING = "greeting"
    HELP = "help"
    CANCEL = "cancel"
    UNKNOWN = "unknown"


class IntentClassifier:
    """Classify user messages into intents using simple rules or Laya."""

    # Intent patterns for rule-based classification
    PATTERNS: dict[Intent, list[str]] = {
        Intent.SUBMIT_COMPLAINT: [
            r"complaint",
            r"issue",
            r"problem",
            r"report",
            r"pothole",
            r"garbage",
            r"water",
            r"power",
            r"electricity",
            r"road",
            r"drainage",
            r"sewage",
            r"pipe",
            r"leak",
            r"street light",
            r"traffic",
            r"bus",
            r"metro",
        ],
        Intent.CHECK_STATUS: [
            r"status",
            r"ticket",
            r"tracking",
            r"update",
            r"progress",
            r"check.*ticket",
            r"cf-\w+",
        ],
        Intent.GET_INFO: [
            r"info",
            r"information",
            r"how to",
            r"how do i",
            r"where is",
            r"what is",
            r"department",
            r"authorities?",
            r"bbmp",
            r"bwssb",
            r"bescom",
        ],
        Intent.GREETING: [
            r"^hi\b",
            r"^hello\b",
            r"^hey\b",
            r"^good\s*(morning|afternoon|evening)",
            r"^namaste\b",
            r"^namaskara\b",
        ],
        Intent.HELP: [
            r"help",
            r"support",
            r"commands?",
            r"what can you do",
            r"how does this work",
        ],
        Intent.CANCEL: [
            r"cancel",
            r"nevermind",
            r"never mind",
            r"stop",
            r"quit",
            r"exit",
        ],
    }

    def __init__(self, use_laya: bool = True):
        """Initialize intent classifier.

        Args:
            use_laya: Whether to use Laya for classification (falls back to rules).
        """
        self.use_laya = use_laya
        self._laya_router = None

    async def _get_laya_router(self):
        """Lazy load Laya router for intent classification."""
        if self._laya_router is not None:
            return self._laya_router

        try:
            from laya import Router

            self._laya_router = Router(preload=False, default="multilingual")
            return self._laya_router
        except ImportError:
            logger.warning("Laya not available for intent classification")
            return None

    async def classify(self, text: str, metadata: dict[str, Any] | None = None) -> tuple[Intent, float]:
        """Classify user message into an intent.

        Args:
            text: User message text.
            metadata: Optional metadata (channel, user_id, etc.).

        Returns:
            Tuple of (intent, confidence).
        """
        text_lower = text.lower().strip()

        # Handle empty or very short messages
        if len(text_lower) < 2:
            return Intent.UNKNOWN, 0.5

        # Try Laya classification first
        if self.use_laya:
            intent = await self._classify_with_laya(text_lower)
            if intent:
                return intent

        # Fall back to rule-based classification
        return self._classify_with_rules(text_lower)

    async def _classify_with_laya(self, text: str) -> tuple[Intent, float] | None:
        """Classify intent using Laya."""
        router = await self._get_laya_router()
        if not router:
            return None

        try:
            # Define intent classification questions
            intent_questions = {
                "intent": {
                    "type": "choice",
                    "instructions": "What does the user want to do?",
                    "criteria": {
                        "submit_complaint": "file a new complaint or report an issue",
                        "check_status": "check the status of an existing ticket or complaint",
                        "get_info": "ask for information about departments, authorities, or services",
                        "greeting": "say hello, greet, or start a conversation",
                        "help": "ask for help, support, or list of available commands",
                        "cancel": "cancel an ongoing action or conversation",
                        "other": "none of the above intents",
                    },
                }
            }

            result = router.predict({"body": text}, intent_questions)
            answer = result["answers"]["intent"]

            intent_str = answer.get("choice", "other")
            confidence = answer.get("answer_confidence", 0.7)

            # Map to Intent enum
            intent_map = {
                "submit_complaint": Intent.SUBMIT_COMPLAINT,
                "check_status": Intent.CHECK_STATUS,
                "get_info": Intent.GET_INFO,
                "greeting": Intent.GREETING,
                "help": Intent.HELP,
                "cancel": Intent.CANCEL,
                "other": Intent.UNKNOWN,
            }

            intent = intent_map.get(intent_str, Intent.UNKNOWN)
            logger.debug("Laya intent classification: %s (conf=%.2f)", intent.value, confidence)

            return intent, confidence

        except Exception as exc:
            logger.error("Laya intent classification failed: %s", exc)
            return None

    def _classify_with_rules(self, text: str) -> tuple[Intent, float]:
        """Rule-based intent classification."""
        scores: dict[Intent, int] = {}

        for intent, patterns in self.PATTERNS.items():
            score = sum(1 for pattern in patterns if re.search(pattern, text))
            if score > 0:
                scores[intent] = score

        if not scores:
            return Intent.UNKNOWN, 0.5

        # Get highest scoring intent
        best_intent = max(scores, key=scores.get)
        total_matches = scores[best_intent]
        confidence = min(0.9, 0.5 + total_matches * 0.15)

        logger.debug("Rule-based intent: %s (matches=%d, conf=%.2f)", best_intent.value, total_matches, confidence)

        return best_intent, confidence

    def extract_ticket_id(self, text: str) -> str | None:
        """Extract a ticket ID from user message.

        Ticket IDs are in format: CF-XXXXXX (alphanumeric)

        Args:
            text: User message text.

        Returns:
            Ticket ID if found, None otherwise.
        """
        # Match CF- followed by 6-8 alphanumeric characters
        match = re.search(r"CF-([A-Z0-9]{6,8})", text.upper())
        if match:
            return f"CF-{match.group(1)}"
        return None

    def extract_location(self, text: str) -> str | None:
        """Extract location from complaint text.

        Uses simple heuristics to find location mentions.

        Args:
            text: Complaint text.

        Returns:
            Extracted location string or None.
        """
        # Common location indicators in Bengaluru
        patterns = [
            r"(?:near|at|on|in|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Road|Street|Main|Cross|Block|Stage|Phase|Layout|Nagar|Colony))?)",
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Metro|Station|Bus Stop|Market|Park|Junction))",
            r"(?:MG Road|Brigade Road|Commercial Street|Indiranagar|Koramangala|Whitefield|Electronic City|HSR Layout|JP Nagar|Jayanagar|Marathahalli|Bellandur|BTM Layout|Banashankari|Rajajinagar|Malleswaram|Yelahanka|Hebbal|HSR|HSR Layout)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip() if match.lastindex else match.group(0).strip()

        return None
