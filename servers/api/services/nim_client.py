"""Google Gemini client — sends prompts to Gemini API for classification."""

from __future__ import annotations

import logging

from google import genai

from api.config import settings

logger = logging.getLogger("civicflow.gemini")

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Lazy-init a Gemini client."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def chat_completion(system_prompt: str, user_message: str) -> str:
    """Send a chat request to Gemini and return the text response."""
    client = _get_client()
    logger.debug("Gemini request → model=%s", settings.gemini_model)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=user_message,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=2048,
            temperature=0.3,
            top_p=0.9,
        ),
    )

    content = response.text
    if content is None:
        raise ValueError("Gemini API returned no content")
    logger.debug("Gemini response length: %d chars", len(content))
    return content
