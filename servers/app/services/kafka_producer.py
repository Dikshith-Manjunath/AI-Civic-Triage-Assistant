"""Kafka producer service for async event publishing."""

from __future__ import annotations

import json

import structlog
from aiokafka import AIOKafkaProducer

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class KafkaService:
    """Async Kafka producer wrapper."""

    def __init__(self):
        self._producer: AIOKafkaProducer | None = None

    async def start(self):
        """Start the Kafka producer."""
        try:
            self._producer = AIOKafkaProducer(
                bootstrap_servers=settings.kafka_bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
            await self._producer.start()
            logger.info("Kafka producer started", servers=settings.kafka_bootstrap_servers)
        except Exception as e:
            logger.warning("Kafka unavailable, running in direct mode", error=str(e))
            self._producer = None

    async def stop(self):
        """Stop the Kafka producer."""
        if self._producer:
            await self._producer.stop()
            logger.info("Kafka producer stopped")

    async def send(self, topic: str, value: dict, key: str | None = None):
        """Send a message to a Kafka topic."""
        if self._producer:
            await self._producer.send_and_wait(topic, value=value, key=key)
            logger.debug("Kafka message sent", topic=topic)
        else:
            # Fallback: process directly (dev mode without Kafka)
            logger.info("Kafka unavailable, triggering direct processing", topic=topic)
            from app.agent.worker import process_complaint_direct
            await process_complaint_direct(value)


kafka_service = KafkaService()
