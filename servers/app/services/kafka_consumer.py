"""Kafka consumer service for processing complaint events."""

from __future__ import annotations

import asyncio
import json

import structlog
from aiokafka import AIOKafkaConsumer

from app.agent.worker import process_complaint_direct
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


async def run_consumer():
    """Run the Kafka consumer to process civic.raw events."""
    consumer = AIOKafkaConsumer(
        settings.kafka_topic_raw,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=settings.kafka_consumer_group,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
    )

    await consumer.start()
    logger.info("Kafka consumer started", topic=settings.kafka_topic_raw)

    try:
        async for msg in consumer:
            event = msg.value
            logger.info("Received complaint event", ticket_id=event.get("ticket_id"))
            try:
                await process_complaint_direct(event)
            except Exception as e:
                logger.error("Failed to process event", error=str(e), ticket_id=event.get("ticket_id"))
    finally:
        await consumer.stop()
        logger.info("Kafka consumer stopped")


if __name__ == "__main__":
    asyncio.run(run_consumer())
