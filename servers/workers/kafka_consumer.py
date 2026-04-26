"""Kafka Consumer Worker — processes civic complaints from Kafka."""

import asyncio
import json
import logging

from kafka import KafkaConsumer

from api.config import settings
from api.db.clickhouse import insert_ticket
from api.services.embeddings import generate_embedding
from api.services.preprocess import (
    caption_image,
    extract_pdf_text,
    transcribe_audio,
    unify_inputs_to_text,
)
from api.services.retrieval import find_similar_complaints
from api.services.ticket_agent import classify_complaint

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("civicflow.worker")

KAFKA_TOPIC = "civic.complaints"
DUPLICATE_THRESHOLD = 0.85


async def process_message(msg):
    """Process a single Kafka message."""
    try:
        data = json.loads(msg.value.decode("utf-8"))
        logger.info(f"Processing message: {data.get('id', 'unknown')}")

        # 1. Multimodal Preprocessing
        text_input = data.get("text", "")
        media = data.get("media", [])

        audio_bytes = None
        pdf_bytes = None
        image_bytes = None

        from api.services.storage import download_from_minio

        for item in media:
            m_type = item.get("type")
            m_path = item.get("path")
            try:
                if m_type == "audio":
                    audio_bytes = download_from_minio(m_path)
                elif m_type == "pdf":
                    pdf_bytes = download_from_minio(m_path)
                elif m_type == "image":
                    image_bytes = download_from_minio(m_path)
            except Exception as exc:
                logger.error(f"Failed to download {m_type} from {m_path}: {exc}")

        audio_transcript = None
        if audio_bytes:
            audio_transcript = transcribe_audio(audio_bytes)

        pdf_text = None
        if pdf_bytes:
            pdf_text = extract_pdf_text(pdf_bytes)

        image_caption = None
        if image_bytes:
            image_caption = caption_image(image_bytes)

        unified_text = unify_inputs_to_text(
            text=text_input,
            audio_transcript=audio_transcript,
            pdf_text=pdf_text,
            image_caption=image_caption,
        )

        # 2. Embedding Generation
        embedding = generate_embedding(unified_text)

        # 3. Duplicate Detection (Eq. 9: Cosine Similarity >= 0.85)
        similar_complaints = find_similar_complaints(embedding, limit=1)
        if similar_complaints and similar_complaints[0]["score"] >= DUPLICATE_THRESHOLD:
            logger.info(
                f"Duplicate detected (score={similar_complaints[0]['score']}). Skipping processing."
            )
            return

        # 4. Classification & RAG (uses OpenClaw/Llama-3 8B via chat_completion)
        # Note: OpenClaw integration assumed to be handled by chat_completion if configured
        classification = await classify_complaint(
            complaint_text=unified_text,
            similar_complaints=similar_complaints,
            complaint_embedding=embedding,
        )

        # 5. Save to ClickHouse
        insert_ticket(
            ticket=classification,
            raw_text=unified_text,
            channel=data.get("channel", "kafka"),
            ticket_id=data.get("id"),
            embedding=embedding,
        )
        logger.info(f"Successfully processed and saved ticket: {data.get('id', 'unknown')}")

    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)


async def main():
    """Main consumer loop."""
    topic = getattr(settings, "kafka_topic_complaints", "civic.complaints")
    consumer = KafkaConsumer(
        topic,
        bootstrap_servers=getattr(settings, "kafka_bootstrap_servers", "localhost:9092"),
        auto_offset_reset="earliest",
        group_id="civicflow-worker-group",
    )

    logger.info(f"Started Kafka consumer for topic: {topic}")

    try:
        for msg in consumer:
            await process_message(msg)
    except KeyboardInterrupt:
        logger.info("Stopping consumer...")
    finally:
        consumer.close()


if __name__ == "__main__":
    asyncio.run(main())
