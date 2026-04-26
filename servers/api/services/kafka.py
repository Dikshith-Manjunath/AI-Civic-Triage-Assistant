"""Kafka service for producing complaint messages."""

from __future__ import annotations

import json
import logging
from typing import Any

from aiokafka import AIOKafkaProducer

from api.config import settings

logger = logging.getLogger("civicflow.kafka")

_producer: AIOKafkaProducer | None = None


async def get_kafka_producer() -> AIOKafkaProducer:
    """Return a module-level AIOKafka producer (lazy singleton)."""
    global _producer
    if _producer is None:
        logger.info("Connecting to Kafka at %s", settings.kafka_bootstrap_servers)
        _producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        await _producer.start()
    return _producer


async def stop_kafka_producer() -> None:
    """Stop the Kafka producer."""
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None


async def produce_complaint(complaint_data: dict[str, Any]) -> None:
    """Produce a complaint message to the Kafka topic."""
    producer = await get_kafka_producer()
    try:
        await producer.send_and_wait(
            settings.kafka_topic_complaints,
            complaint_data,
        )
        logger.info(
            "Produced complaint message to %s: %s",
            settings.kafka_topic_complaints,
            complaint_data.get("id"),
        )
    except Exception as exc:
        logger.error("Failed to produce Kafka message: %s", exc)
        raise
