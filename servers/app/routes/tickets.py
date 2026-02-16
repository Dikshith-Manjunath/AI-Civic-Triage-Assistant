"""GET /tickets - Retrieve triaged tickets."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

import structlog
from fastapi import APIRouter, Query

from app.schemas import TicketListOut, TicketOut
from app.services.clickhouse_client import clickhouse_service

router = APIRouter()
logger = structlog.get_logger()


@router.get("/tickets", response_model=TicketListOut)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    department: Optional[str] = Query(None),
    urgency: Optional[int] = Query(None, ge=0, le=2),
    status: Optional[str] = Query(None),
):
    """List all triaged tickets with pagination and filters."""
    filters = {}
    if department:
        filters["dept"] = department
    if urgency is not None:
        filters["urgency"] = urgency
    if status:
        filters["status"] = status

    rows, total = clickhouse_service.get_tickets(
        page=page, page_size=page_size, filters=filters
    )

    tickets = [
        TicketOut(
            id=row["id"],
            timestamp=row["timestamp"],
            department=row["dept"],
            urgency=row["urgency"],
            summary=row["summary"],
            location_lat=row.get("lat"),
            location_lon=row.get("lon"),
            status=row["status"],
            channel=row["channel"],
            citizen_reply=row.get("citizen_reply"),
        )
        for row in rows
    ]

    return TicketListOut(
        tickets=tickets,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/tickets/{ticket_id}", response_model=TicketOut)
async def get_ticket(ticket_id: UUID):
    """Get a single ticket by ID."""
    row = clickhouse_service.get_ticket_by_id(str(ticket_id))
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found")

    return TicketOut(
        id=row["id"],
        timestamp=row["timestamp"],
        department=row["dept"],
        urgency=row["urgency"],
        summary=row["summary"],
        location_lat=row.get("lat"),
        location_lon=row.get("lon"),
        status=row["status"],
        channel=row["channel"],
        citizen_reply=row.get("citizen_reply"),
    )
