"""ClickHouse data warehouse client."""

from __future__ import annotations

from typing import Any

import structlog
import clickhouse_connect

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS civic_complaints (
    id UUID,
    timestamp DateTime64(3),
    dept String,
    urgency UInt8,
    summary String,
    citizen_reply String DEFAULT '',
    lat Float64 DEFAULT 0.0,
    lon Float64 DEFAULT 0.0,
    status String DEFAULT 'processing',
    channel String DEFAULT 'web',
    embedding Array(Float32) DEFAULT [],
    location_str String DEFAULT ''
) ENGINE = MergeTree()
ORDER BY timestamp;

CREATE TABLE IF NOT EXISTS civic_media (
    id UUID,
    complaint_id UUID,
    type Enum8('text' = 1, 'audio' = 2, 'image' = 3, 'pdf' = 4),
    file_path String,
    caption String DEFAULT '',
    whisper_confidence Float32 DEFAULT 0.0,
    created_at DateTime64(3) DEFAULT now64()
) ENGINE = MergeTree()
ORDER BY created_at;
"""


class ClickHouseService:
    """ClickHouse client wrapper for CivicFlow."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                self._client = clickhouse_connect.get_client(
                    host=settings.clickhouse_host,
                    port=settings.clickhouse_port,
                    database=settings.clickhouse_db,
                    username=settings.clickhouse_user,
                    password=settings.clickhouse_password,
                )
                logger.info("ClickHouse connected")
            except Exception as e:
                logger.warning("ClickHouse unavailable", error=str(e))
                return None
        return self._client

    def ensure_tables(self):
        """Create tables if they don't exist."""
        client = self._get_client()
        if client:
            for stmt in SCHEMA_SQL.strip().split(";"):
                stmt = stmt.strip()
                if stmt:
                    client.command(stmt)
            logger.info("ClickHouse tables ensured")

    def insert_complaint(self, data: dict):
        """Insert a triaged complaint into ClickHouse."""
        client = self._get_client()
        if not client:
            logger.error("Cannot insert: ClickHouse unavailable")
            return

        client.insert(
            "civic_complaints",
            [[
                data["id"],
                data["timestamp"],
                data["dept"],
                data["urgency"],
                data["summary"],
                data.get("citizen_reply", ""),
                data.get("lat", 0.0),
                data.get("lon", 0.0),
                data.get("status", "triaged"),
                data.get("channel", "web"),
                data.get("embedding", []),
                data.get("location_str", ""),
            ]],
            column_names=[
                "id", "timestamp", "dept", "urgency", "summary",
                "citizen_reply", "lat", "lon", "status", "channel",
                "embedding", "location_str",
            ],
        )
        logger.info("Complaint inserted into ClickHouse", id=data["id"])

    def insert_media(self, data: dict):
        """Insert a media record."""
        client = self._get_client()
        if not client:
            return

        client.insert(
            "civic_media",
            [[
                data["id"],
                data["complaint_id"],
                data["type"],
                data["file_path"],
                data.get("caption", ""),
                data.get("whisper_confidence", 0.0),
            ]],
            column_names=["id", "complaint_id", "type", "file_path", "caption", "whisper_confidence"],
        )

    def get_tickets(
        self, page: int = 1, page_size: int = 20, filters: dict | None = None
    ) -> tuple[list[dict], int]:
        """Get paginated tickets with optional filters."""
        client = self._get_client()
        if not client:
            return [], 0

        where_clauses = []
        params: dict[str, Any] = {}

        if filters:
            if "dept" in filters:
                where_clauses.append("dept = {dept:String}")
                params["dept"] = filters["dept"]
            if "urgency" in filters:
                where_clauses.append("urgency = {urgency:UInt8}")
                params["urgency"] = filters["urgency"]
            if "status" in filters:
                where_clauses.append("status = {status:String}")
                params["status"] = filters["status"]

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        offset = (page - 1) * page_size

        count_q = f"SELECT count() FROM civic_complaints WHERE {where_sql}"
        total = client.query(count_q, parameters=params).result_rows[0][0]

        data_q = f"""
            SELECT id, timestamp, dept, urgency, summary, citizen_reply,
                   lat, lon, status, channel
            FROM civic_complaints
            WHERE {where_sql}
            ORDER BY timestamp DESC
            LIMIT {page_size} OFFSET {offset}
        """
        result = client.query(data_q, parameters=params)

        rows = []
        for row in result.result_rows:
            rows.append({
                "id": row[0],
                "timestamp": row[1],
                "dept": row[2],
                "urgency": row[3],
                "summary": row[4],
                "citizen_reply": row[5],
                "lat": row[6] if row[6] != 0.0 else None,
                "lon": row[7] if row[7] != 0.0 else None,
                "status": row[8],
                "channel": row[9],
            })

        return rows, total

    def get_ticket_by_id(self, ticket_id: str) -> dict | None:
        """Get a single ticket by UUID."""
        client = self._get_client()
        if not client:
            return None

        q = """
            SELECT id, timestamp, dept, urgency, summary, citizen_reply,
                   lat, lon, status, channel
            FROM civic_complaints
            WHERE id = {ticket_id:UUID}
            LIMIT 1
        """
        result = client.query(q, parameters={"ticket_id": ticket_id})
        if not result.result_rows:
            return None

        row = result.result_rows[0]
        return {
            "id": row[0],
            "timestamp": row[1],
            "dept": row[2],
            "urgency": row[3],
            "summary": row[4],
            "citizen_reply": row[5],
            "lat": row[6] if row[6] != 0.0 else None,
            "lon": row[7] if row[7] != 0.0 else None,
            "status": row[8],
            "channel": row[9],
        }

    def get_kpis(self) -> dict:
        """Compute dashboard KPIs."""
        client = self._get_client()
        if not client:
            return {
                "total_complaints": 0,
                "open_complaints": 0,
                "avg_resolution_hours": 0.0,
                "urgency_distribution": {},
                "department_distribution": {},
                "daily_trend": [],
            }

        total = client.query("SELECT count() FROM civic_complaints").result_rows[0][0]
        open_c = client.query(
            "SELECT count() FROM civic_complaints WHERE status NOT IN ('resolved')"
        ).result_rows[0][0]

        # Urgency distribution
        urgency_rows = client.query(
            "SELECT urgency, count() FROM civic_complaints GROUP BY urgency"
        ).result_rows
        urgency_map = {str(r[0]): r[1] for r in urgency_rows}

        # Department distribution
        dept_rows = client.query(
            "SELECT dept, count() FROM civic_complaints GROUP BY dept ORDER BY count() DESC"
        ).result_rows
        dept_map = {r[0]: r[1] for r in dept_rows}

        # Daily trend (last 30 days)
        trend_rows = client.query("""
            SELECT toDate(timestamp) as day, count()
            FROM civic_complaints
            WHERE timestamp >= now() - INTERVAL 30 DAY
            GROUP BY day ORDER BY day
        """).result_rows
        daily = [{"date": str(r[0]), "count": r[1]} for r in trend_rows]

        return {
            "total_complaints": total,
            "open_complaints": open_c,
            "avg_resolution_hours": 0.0,
            "urgency_distribution": urgency_map,
            "department_distribution": dept_map,
            "daily_trend": daily,
        }

    def get_heatmap_data(self) -> dict:
        """Get geo-points for heatmap."""
        client = self._get_client()
        if not client:
            return {"points": []}

        rows = client.query("""
            SELECT id, lat, lon, urgency, dept, summary
            FROM civic_complaints
            WHERE lat != 0.0 AND lon != 0.0
            LIMIT 5000
        """).result_rows

        points = [
            {
                "complaint_id": r[0],
                "lat": r[1],
                "lon": r[2],
                "urgency": r[3],
                "department": r[4],
                "summary": r[5],
            }
            for r in rows
        ]
        return {"points": points}

    def get_department_trend(self) -> list[dict]:
        """Daily complaint counts per department for last 30 days."""
        client = self._get_client()
        if not client:
            return []

        rows = client.query("""
            SELECT toDate(timestamp) as day, dept, count() as cnt
            FROM civic_complaints
            WHERE timestamp >= now() - INTERVAL 30 DAY
            GROUP BY day, dept
            ORDER BY day, dept
        """).result_rows

        return [{"date": str(r[0]), "department": r[1], "count": r[2]} for r in rows]

    def search_similar(self, embedding: list[float], limit: int = 5) -> list[dict]:
        """Vector similarity search using cosine distance."""
        client = self._get_client()
        if not client:
            return []

        # ClickHouse cosine distance
        emb_str = "[" + ",".join(str(x) for x in embedding) + "]"
        rows = client.query(f"""
            SELECT id, dept, urgency, summary,
                   cosineDistance(embedding, {emb_str}) as dist
            FROM civic_complaints
            WHERE length(embedding) > 0
            ORDER BY dist ASC
            LIMIT {limit}
        """).result_rows

        return [
            {"id": r[0], "dept": r[1], "urgency": r[2], "summary": r[3], "distance": r[4]}
            for r in rows
        ]


clickhouse_service = ClickHouseService()
