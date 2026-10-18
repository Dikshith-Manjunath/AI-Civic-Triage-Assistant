"""Bot configuration settings."""

from __future__ import annotations

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BotSettings(BaseSettings):
    """Telegram bot settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Telegram Bot ──
    telegram_bot_token: str = Field("", alias="TELEGRAM_BOT_TOKEN")
    telegram_webhook_url: str | None = Field(None, alias="TELEGRAM_WEBHOOK_URL")
    telegram_webhook_secret: str = Field("", alias="TELEGRAM_WEBHOOK_SECRET")

    # ── Groq API ──
    groq_api_key: str = Field("", alias="GROQ_API_KEY")
    groq_model: str = Field("llama-3.3-70b-versatile", alias="GROQ_MODEL")
    groq_temperature: float = Field(0.7, alias="GROQ_TEMPERATURE")
    groq_max_tokens: int = Field(1000, alias="GROQ_MAX_TOKENS")

    # ── Backend API ──
    civicflow_api_url: str = Field("http://localhost:8000", alias="CIVICFLOW_API_URL")
    civicflow_api_key: str | None = Field(None, alias="CIVICFLOW_API_KEY")

    # ── Bot Behavior ──
    bot_language: str = Field("en", alias="BOT_LANGUAGE")  # en, kn, hi
    max_conversation_history: int = Field(10, alias="MAX_CONVERSATION_HISTORY")
    complaint_keywords_threshold: int = Field(3, alias="COMPLAINT_KEYWORDS_THRESHOLD")

    def is_configured(self) -> bool:
        """Check if bot is properly configured with required credentials."""
        return bool(self.telegram_bot_token and self.groq_api_key)

    def validate_or_raise(self) -> None:
        """Validate configuration and raise error if missing credentials."""
        missing = []
        if not self.telegram_bot_token:
            missing.append("TELEGRAM_BOT_TOKEN")
        if not self.groq_api_key:
            missing.append("GROQ_API_KEY")
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}. "
                "Set them before running the bot."
            )


# Lazy singleton - instantiated on first access
_bot_settings: BotSettings | None = None


def get_bot_settings() -> BotSettings:
    """Get bot settings singleton (lazy initialization)."""
    global _bot_settings
    if _bot_settings is None:
        _bot_settings = BotSettings()
    return _bot_settings


# For backwards compatibility - but warns if accessed without env vars
# Tests should use get_bot_settings() or mock the settings
bot_settings = property(lambda self: get_bot_settings())
