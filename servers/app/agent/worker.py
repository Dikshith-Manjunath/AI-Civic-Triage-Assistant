"""Direct worker for processing complaints (Kafka consumer or direct mode)."""

from __future__ import annotations

import structlog

from app.agent.graph import triage_graph

logger = structlog.get_logger()


async def process_complaint_direct(event: dict):
    """
    Process a complaint event directly (when Kafka is unavailable).
    In production, this is called by the Kafka consumer.
    """
    logger.info("Processing complaint", ticket_id=event["ticket_id"])

    initial_state = {
        "complaint_id": event["ticket_id"],
        "raw_text": event.get("text"),
        "media_paths": event.get("media_paths", []),
        "media_types": event.get("media_types", []),
        "location": event.get("location"),
        "channel": event.get("channel", "web"),
        # Initialize empty fields
        "transcription": "",
        "image_caption": "",
        "pdf_text": "",
        "unified_text": "",
        "entities": {},
        "location_str": "",
        "similar_tickets": [],
        "sop_context": "",
        "department": "general",
        "urgency": 1,
        "summary": "",
        "citizen_reply": "",
        "lat": 0.0,
        "lon": 0.0,
        "is_valid": False,
        "validation_errors": [],
        "retry_count": 0,
        "embedding": [],
    }

    try:
        result = await triage_graph.ainvoke(initial_state)
        logger.info(
            "Complaint processed",
            ticket_id=event["ticket_id"],
            department=result.get("department"),
            urgency=result.get("urgency"),
        )
        return result
    except Exception as e:
        logger.error("Agent pipeline failed", ticket_id=event["ticket_id"], error=str(e))
        raise
