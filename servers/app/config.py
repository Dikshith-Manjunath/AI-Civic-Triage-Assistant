"""CivicFlow configuration via pydantic-settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ──
    app_name: str = "civicflow"
    app_env: str = "development"
    log_level: str = "INFO"

    # ── ClickHouse ──
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_db: str = "civicflow"
    clickhouse_user: str = "civicflow"
    clickhouse_password: str = "civicflow_secret"

    # ── Kafka ──
    kafka_bootstrap_servers: str = "localhost:19092"
    kafka_topic_raw: str = "civic.raw"
    kafka_topic_processed: str = "civic.processed"
    kafka_consumer_group: str = "civicflow-workers"

    # ── MinIO ──
    minio_endpoint: str = "localhost:9002"
    minio_access_key: str = "civicflow"
    minio_secret_key: str = "civicflow_secret"
    minio_bucket: str = "civic-media"
    minio_secure: bool = False

    # ── OpenLLM ──
    openllm_base_url: str = "http://localhost:11434/v1"
    openllm_model: str = "llama3.1:8b-instruct"

    # ── Groq Fallback ──
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    # ── Embedding ──
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ── Whisper ──
    whisper_model: str = "small"

    # ── Geocoding ──
    nominatim_url: str = "https://nominatim.openstreetmap.org"


@lru_cache
def get_settings() -> Settings:
    return Settings()
