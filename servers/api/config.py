"""CivicFlow Application Configuration.

All settings are loaded from environment variables with sensible defaults.
For production, override via .env file or environment variables.
"""

from __future__ import annotations

from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──
    app_name: str = "civicflow"
    app_env: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    debug: bool = Field(default=False, alias="DEBUG")

    # ── ClickHouse Database ──
    clickhouse_host: str = Field(default="localhost", alias="CLICKHOUSE_HOST")
    clickhouse_port: int = Field(default=8123, alias="CLICKHOUSE_PORT")
    clickhouse_db: str = Field(default="civicflow", alias="CLICKHOUSE_DB")
    clickhouse_user: str = Field(default="civicflow", alias="CLICKHOUSE_USER")
    clickhouse_password: str = Field(default="civicflow", alias="CLICKHOUSE_PASSWORD")

    # ── Redis Cache ──
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    redis_cache_ttl: int = Field(default=3600, alias="REDIS_CACHE_TTL")  # 1 hour
    redis_enabled: bool = Field(default=True, alias="REDIS_ENABLED")

    # ── Laya Classifier ──
    laya_classifier_url: str = Field(default="http://localhost:8001", alias="LAYA_CLASSIFIER_URL")
    laya_classifier_timeout: int = Field(default=30, alias="LAYA_CLASSIFIER_TIMEOUT")
    laya_classifier_enabled: bool = Field(default=True, alias="LAYA_CLASSIFIER_ENABLED")

    # ── Google Gemini (Legacy - optional, Laya is preferred) ──
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")

    # ── MinIO Object Storage ──
    minio_endpoint: str = Field(default="localhost:9100", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(default="minioadmin", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(default="minioadmin", alias="MINIO_SECRET_KEY")
    minio_bucket: str = Field(default="civic-media", alias="MINIO_BUCKET")
    minio_secure: bool = Field(default=False, alias="MINIO_SECURE")

    # ── Kafka Event Streaming ──
    kafka_bootstrap_servers: str = Field(default="localhost:9092", alias="KAFKA_BOOTSTRAP_SERVERS")
    kafka_topic_complaints: str = Field(default="civic.complaints", alias="KAFKA_TOPIC_COMPLAINTS")
    kafka_consumer_group: str = Field(default="civicflow-worker-group", alias="KAFKA_CONSUMER_GROUP")

    # ── Discord Integration ──
    # Webhooks per department (set via environment)
    discord_webhook_roads: str = Field(default="", alias="DISCORD_WEBHOOK_ROADS")
    discord_webhook_water: str = Field(default="", alias="DISCORD_WEBHOOK_WATER")
    discord_webhook_electricity: str = Field(default="", alias="DISCORD_WEBHOOK_ELECTRICITY")
    discord_webhook_sanitation: str = Field(default="", alias="DISCORD_WEBHOOK_SANITATION")
    discord_webhook_transport: str = Field(default="", alias="DISCORD_WEBHOOK_TRANSPORT")
    discord_webhook_housing: str = Field(default="", alias="DISCORD_WEBHOOK_HOUSING")
    discord_webhook_planning: str = Field(default="", alias="DISCORD_WEBHOOK_PLANNING")
    discord_webhook_fallback: str = Field(default="", alias="DISCORD_WEBHOOK_FALLBACK")

    # Discord Bot (for slash commands)
    discord_public_key: str = Field(default="", alias="DISCORD_PUBLIC_KEY")
    discord_app_id: str = Field(default="", alias="DISCORD_APP_ID")
    discord_bot_token: str = Field(default="", alias="DISCORD_BOT_TOKEN")

    # ── Telegram Bot ──
    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    telegram_webhook_url: str = Field(default="", alias="TELEGRAM_WEBHOOK_URL")
    telegram_enabled: bool = Field(default=False, alias="TELEGRAM_ENABLED")

    # ── Security ──
    secret_key: str = Field(
        default="change-me-in-production-use-secure-random-string",
        alias="SECRET_KEY",
    )
    api_key_hash_rounds: int = Field(default=12, alias="API_KEY_HASH_ROUNDS")

    # ── Rate Limiting ──
    rate_limit_enabled: bool = Field(default=True, alias="RATE_LIMIT_ENABLED")
    rate_limit_requests_per_minute: int = Field(default=60, alias="RATE_LIMIT_REQUESTS_PER_MINUTE")
    rate_limit_requests_per_hour: int = Field(default=1000, alias="RATE_LIMIT_REQUESTS_PER_HOUR")

    # ── OpenTelemetry Tracing ──
    otlp_endpoint: str | None = Field(default=None, alias="OTLP_ENDPOINT")
    tracing_enabled: bool = Field(default=False, alias="TRACING_ENABLED")
    tracing_sample_rate: float = Field(default=1.0, alias="TRACING_SAMPLE_RATE")

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.app_env.lower() in ("production", "prod", "live")

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.app_env.lower() in ("development", "dev", "local")

    def get_discord_webhook(self, department: str) -> str | None:
        """Get Discord webhook URL for a department."""
        webhooks = {
            "roads": self.discord_webhook_roads,
            "water": self.discord_webhook_water,
            "electricity": self.discord_webhook_electricity,
            "sanitation": self.discord_webhook_sanitation,
            "transport": self.discord_webhook_transport,
            "housing": self.discord_webhook_housing,
            "planning": self.discord_webhook_planning,
        }
        return webhooks.get(department.lower()) or self.discord_webhook_fallback or None

    def model_dump_safe(self) -> dict[str, Any]:
        """Dump settings with sensitive values masked."""
        data = self.model_dump()
        sensitive_keys = {
            "google_api_key",
            "clickhouse_password",
            "minio_secret_key",
            "secret_key",
            "discord_bot_token",
            "telegram_bot_token",
        }
        for key in sensitive_keys:
            if key in data and data[key]:
                data[key] = "***MASKED***"
        return data


# Singleton instance
settings = Settings()
