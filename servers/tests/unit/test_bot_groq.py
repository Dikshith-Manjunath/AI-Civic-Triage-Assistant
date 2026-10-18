"""Tests for Groq client."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from bot.groq_client import GroqClient


class TestGroqClient:
    """Test Groq API client."""

    def test_initialization(self):
        """Test client initialization."""
        client = GroqClient(
            api_key="test_key",
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1000,
        )

        assert client.api_key == "test_key"
        assert client.model == "llama-3.3-70b-versatile"
        assert client.temperature == 0.7
        assert client.max_tokens == 1000

    @pytest.mark.asyncio
    async def test_chat_completion_success(self):
        """Test successful chat completion."""
        client = GroqClient(api_key="test_key")

        # Mock httpx response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "Hello! How can I help?",
                    }
                }
            ],
            "usage": {"total_tokens": 50},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await client.chat_completion(
                messages=[{"role": "user", "content": "Hello"}]
            )

            assert "choices" in result
            assert result["choices"][0]["message"]["content"] == "Hello! How can I help?"
            mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_analyze_intent_json_extraction(self):
        """Test intent analysis with JSON extraction."""
        client = GroqClient(api_key="test_key")

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": 'Here is the analysis: ```json\n{"intent": "submit_complaint", "emotional_state": "frustrated", "confidence": 0.9}\n```'
                    }
                }
            ],
            "usage": {"total_tokens": 100},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await client.analyze_intent("There's a pothole!")

            assert result["intent"] == "submit_complaint"
            assert result["emotional_state"] == "frustrated"
            assert result["confidence"] == 0.9

    @pytest.mark.asyncio
    async def test_analyze_intent_fallback(self):
        """Test intent analysis fallback on error."""
        client = GroqClient(api_key="test_key")

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = Exception("API error")

            result = await client.analyze_intent("Test message")

            assert result["intent"] == "unclear"
            assert result["confidence"] == 0.0

    @pytest.mark.asyncio
    async def test_generate_response(self):
        """Test response generation."""
        client = GroqClient(api_key="test_key")

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "I'm here to help with civic issues!",
                    }
                }
            ],
            "usage": {"total_tokens": 50},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client._client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            response = await client.generate_response("Hello")

            assert response == "I'm here to help with civic issues!"
