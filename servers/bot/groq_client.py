"""Groq API client for fast LLM inference.

Uses Groq for:
- Intent detection
- Keyword extraction
- Emotional state analysis
- Response generation
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from bot.config import get_bot_settings
from bot.prompts import SYSTEM_PROMPT, INTENT_DETECTION_PROMPT

logger = logging.getLogger("civicflow.bot.groq")


class GroqClient:
    """Client for Groq API with rate limiting and error handling."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        """Initialize Groq client."""
        settings = get_bot_settings()
        self.api_key = api_key or settings.groq_api_key
        self.model = model or settings.groq_model
        self.temperature = temperature or settings.groq_temperature
        self.max_tokens = max_tokens or settings.groq_max_tokens
        self.base_url = "https://api.groq.com/openai/v1"

        self._client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """Send a chat completion request to Groq.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate

        Returns:
            Response dict with 'choices', 'usage', etc.
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or self.temperature,
            "max_tokens": max_tokens or self.max_tokens,
        }

        start_time = time.perf_counter()

        try:
            response = await self._client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
            )
            response.raise_for_status()

            result = response.json()
            duration_ms = (time.perf_counter() - start_time) * 1000

            logger.info(
                "Groq completion: model=%s tokens=%d duration=%.1fms",
                self.model,
                result.get("usage", {}).get("total_tokens", 0),
                duration_ms,
            )

            return result

        except httpx.HTTPStatusError as exc:
            logger.error("Groq API error: %s - %s", exc.response.status_code, exc.response.text)
            raise

        except Exception as exc:
            logger.error("Groq request failed: %s", exc)
            raise

    async def analyze_intent(self, user_message: str) -> dict[str, Any]:
        """Analyze user intent and extract key information.

        Args:
            user_message: User's message text

        Returns:
            Dict with intent, emotional_state, issue_type, location, etc.
        """
        messages = [
            {"role": "system", "content": INTENT_DETECTION_PROMPT},
            {"role": "user", "content": user_message},
        ]

        try:
            response = await self.chat_completion(messages, temperature=0.3)
            content = response["choices"][0]["message"]["content"]

            # Parse JSON from response
            import json

            # Try to extract JSON from the response
            json_start = content.find("{")
            json_end = content.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)

            # Fallback: return default intent
            return {
                "intent": "unclear",
                "emotional_state": "calm",
                "issue_type": None,
                "location": None,
                "urgency_indicators": [],
                "confidence": 0.5,
            }

        except Exception as exc:
            logger.error("Intent analysis failed: %s", exc)
            return {
                "intent": "unclear",
                "emotional_state": "calm",
                "issue_type": None,
                "location": None,
                "urgency_indicators": [],
                "confidence": 0.0,
            }

    async def generate_response(
        self,
        user_message: str,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> str:
        """Generate a response to the user's message.

        Args:
            user_message: User's message text
            conversation_history: Previous messages in the conversation

        Returns:
            Generated response text
        """
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history[-10:])  # Last 10 messages

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        try:
            response = await self.chat_completion(messages)
            return response["choices"][0]["message"]["content"]

        except Exception as exc:
            logger.error("Response generation failed: %s", exc)
            return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."


# Singleton instance
_groq_client: GroqClient | None = None


async def get_groq_client() -> GroqClient:
    """Get or create the Groq client singleton."""
    global _groq_client
    if _groq_client is None:
        _groq_client = GroqClient()
    return _groq_client


async def close_groq_client():
    """Close the Groq client."""
    global _groq_client
    if _groq_client is not None:
        await _groq_client.close()
        _groq_client = None
