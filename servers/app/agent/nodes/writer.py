"""Writer node: persist triaged ticket to ClickHouse."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import structlog

from app.services.clickhouse_client import clickhouse_service

logger = structlog.get_logger()


async def write_to_clickhouse(state: dict) -> dict:
    """Write the final triaged ticket to ClickHouse."""
    log = logger.bind(complaint_id=state["complaint_id"])

    try:
        complaint_data = {
            "id": state["complaint_id"],
            "timestamp": datetime.now(timezone.utc),
            "dept": state.get("department", "general"),
            "urgency": state.get("urgency", 1),
            "summary": state.get("summary", ""),
            "citizen_reply": state.get("citizen_reply", ""),
            "lat": state.get("lat", 0.0),
            "lon": state.get("lon", 0.0),
            "status": "triaged",
            "channel": state.get("channel", "web"),
            "embedding": state.get("embedding", []),
            "location_str": state.get("location_str", ""),
        }

        clickhouse_service.insert_complaint(complaint_data)

        # Insert media records
        for path, mtype in zip(
            state.get("media_paths", []),
            state.get("media_types", []),
        ):
            media_data = {
                "id": str(uuid.uuid4()),
                "complaint_id": state["complaint_id"],
                "type": mtype,
                "file_path": path,
                "caption": "",
                "whisper_confidence": 0.0,
            }
            clickhouse_service.insert_media(media_data)

        log.info("Ticket written to ClickHouse", dept=complaint_data["dept"])

    except Exception as e:
        log.error("Failed to write to ClickHouse", error=str(e))

    return state
