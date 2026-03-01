"""ClickHouse client for CivicFlow — async-compatible wrapper around clickhouse-connect."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from pathlib import Path

import clickhouse_connect
from clickhouse_connect.driver.client import Client as CHClient

from api.config import settings
from api.models.ticket import TicketClassification

logger = logging.getLogger("civicflow.db")

_client: CHClient | None = None


def get_client() -> CHClient:
    """Return a module-level ClickHouse client (lazy singleton)."""
    global _client
    if _client is None:
        logger.info(
            "Connecting to ClickHouse at %s:%s db=%s",
            settings.clickhouse_host,
            settings.clickhouse_port,
            settings.clickhouse_db,
        )
        _client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            database=settings.clickhouse_db,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
        )
    return _client


def init_db() -> None:
    """Run the schema SQL to ensure the database and table exist."""
    schema_path = Path(__file__).parent / "schemas.sql"
    sql = schema_path.read_text()

    # clickhouse-connect expects one statement at a time
    # Use a raw client (no DB selected) for the CREATE DATABASE statement
    raw = clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
    )
    for statement in sql.split(";"):
        stmt = statement.strip()
        if stmt:
            logger.debug("Executing SQL: %s", stmt[:80])
            raw.command(stmt)
    raw.close()
    logger.info("ClickHouse schema initialised.")


def insert_ticket(
    ticket: TicketClassification,
    raw_text: str,
    channel: str = "web",
    ticket_id: str | None = None,
    embedding: list[float] | None = None,
) -> dict:
    """Insert a classified ticket into civic_complaints. Returns the row dict."""
    client = get_client()
    if ticket_id is None:
        ticket_id = str(uuid.uuid4())
    now = datetime.now(UTC)

    row = [
        ticket_id,
        now,
        ticket.dept,
        ticket.authority,
        ticket.urgency,
        ticket.summary,
        ticket.reply,
        "pending",
        channel,
        raw_text,
        embedding or [],
    ]

    client.insert(
        table="civic_complaints",
        data=[row],
        column_names=[
            "id", "timestamp", "dept", "authority", "urgency",
            "summary", "reply", "status", "channel", "raw_text", "embedding",
        ],
    )
    logger.info("Inserted ticket %s [dept=%s, authority=%s, status=pending]", ticket_id, ticket.dept, ticket.authority)

    return {
        "id": ticket_id,
        "timestamp": now.isoformat(),
        "dept": ticket.dept,
        "authority": ticket.authority,
        "urgency": ticket.urgency,
        "summary": ticket.summary,
        "reply": ticket.reply,
        "status": "pending",
    }


def insert_media(
    complaint_id: str,
    media_type: str,
    object_path: str,
    filename: str,
    content_type: str,
    size_bytes: int,
) -> str:
    """Insert a media metadata row into civic_media. Returns the media id."""
    client = get_client()
    media_id = str(uuid.uuid4())

    client.insert(
        table="civic_media",
        data=[
            [
                media_id,
                complaint_id,
                media_type,
                object_path,
                filename,
                content_type,
                size_bytes,
            ]
        ],
        column_names=[
            "id", "complaint_id", "type", "object_path",
            "filename", "content_type", "size_bytes",
        ],
    )
    logger.info(
        "Inserted media %s for complaint %s [type=%s, path=%s]",
        media_id, complaint_id, media_type, object_path,
    )
    return media_id


def fetch_media_for_complaint(complaint_id: str) -> list[dict]:
    """Return all media metadata rows for a given complaint."""
    client = get_client()
    result = client.query(
        "SELECT id, complaint_id, type, object_path, filename, content_type, size_bytes "
        "FROM civic_media WHERE complaint_id = %(cid)s ORDER BY type",
        parameters={"cid": complaint_id},
    )
    columns = result.column_names
    rows: list[dict] = []
    for row in result.result_rows:
        d = dict(zip(columns, row))
        d["id"] = str(d["id"])
        d["complaint_id"] = str(d["complaint_id"])
        rows.append(d)
    return rows


def fetch_all_tickets(limit: int = 100) -> list[dict]:
    """Return the most recent tickets."""
    client = get_client()
    result = client.query(
        f"SELECT id, timestamp, dept, authority, urgency, summary, reply, status "
        f"FROM civic_complaints ORDER BY timestamp DESC LIMIT {limit}"
    )
    columns = result.column_names
    rows: list[dict] = []
    for row in result.result_rows:
        d = dict(zip(columns, row))
        # Ensure id and timestamp are serialisable strings
        d["id"] = str(d["id"])
        d["timestamp"] = (
            d["timestamp"].isoformat() if hasattr(d["timestamp"], "isoformat") else str(d["timestamp"])
        )
        rows.append(d)
    return rows


def fetch_tickets_by_authority(authority: str, limit: int = 200) -> list[dict]:
    """Return tickets filtered by authority code (e.g. BBMP, BWSSB)."""
    client = get_client()
    result = client.query(
        "SELECT id, timestamp, dept, authority, urgency, summary, reply, status, "
        "raw_text, channel, approved_by, approved_at "
        "FROM civic_complaints "
        "WHERE upper(authority) = %(auth)s "
        "ORDER BY timestamp DESC LIMIT %(lim)s",
        parameters={"auth": authority.upper(), "lim": limit},
    )
    columns = result.column_names
    rows: list[dict] = []
    for row in result.result_rows:
        d = dict(zip(columns, row))
        d["id"] = str(d["id"])
        d["timestamp"] = (
            d["timestamp"].isoformat() if hasattr(d["timestamp"], "isoformat") else str(d["timestamp"])
        )
        if hasattr(d.get("approved_at"), "isoformat"):
            d["approved_at"] = d["approved_at"].isoformat()
        else:
            d["approved_at"] = str(d.get("approved_at", ""))
        rows.append(d)
    return rows
