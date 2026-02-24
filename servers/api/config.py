"""CivicFlow configuration — loads from environment / .env file."""

from __future__ import annotations
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application-wide settings, populated from env vars / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──
    app_name: str = "civicflow"
    app_env: str = "development"
    log_level: str = "DEBUG"

    # ── ClickHouse ──
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_db: str = "civicflow"
    clickhouse_user: str = "civicflow"
    clickhouse_password: str = "civicflow"

    # ── Google Gemini ──
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # ── MinIO (not used in Phase 1, kept for reference) ──
    minio_endpoint: str = "localhost:9100"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "civic-media"
    minio_secure: bool = False

    # ── Discord Webhooks (per-department) ──
    discord_webhook_roads: str = ""
    discord_webhook_water: str = ""
    discord_webhook_electricity: str = ""
    discord_webhook_sanitation: str = ""
    discord_webhook_transport: str = ""
    discord_webhook_housing: str = ""
    discord_webhook_planning: str = ""
    discord_webhook_fallback: str = ""

    # ── Discord Application (interactions / buttons) ──
    discord_public_key: str = ""
    discord_app_id: str = ""


settings = Settings()
