"""Ticket lifecycle router — approve, reject, and transition ticket status.

DEPRECATED: Use /api/v1/tickets instead. This endpoint will be removed in v2.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from api.services.approval import (
    IllegalTransitionError,
    approve_ticket,
    reject_ticket,
    transition_ticket,
)
from api.services.notifier import send_discord_notification

logger = logging.getLogger("civicflow.routes.tickets")

router = APIRouter(prefix="/tickets", tags=["tickets"], deprecated=True)


# ── Request / Response models ──


class ApprovalRequest(BaseModel):
    """Body for approve/reject endpoints."""

    approved_by: str = Field(..., min_length=1, description="Name or ID of the approver")


class TransitionRequest(BaseModel):
    """Body for generic status transition."""

    new_status: str = Field(..., min_length=1, description="Target status")
    acted_by: str = Field("system", description="Who triggered the transition")


class TransitionResponse(BaseModel):
    """Response after a status transition."""

    ticket_id: str
    old_status: str
    new_status: str
    acted_by: str
    timestamp: str


# ── Endpoints ──


@router.post(
    "/{ticket_id}/approve",
    response_model=TransitionResponse,
    summary="Approve a ticket (DEPRECATED)",
    description="DEPRECATED: Use /api/v1/tickets/{ticket_id}/approve instead.",
    deprecated=True,
)
async def approve_legacy(ticket_id: str, body: ApprovalRequest):
    """Approve a pending ticket."""
    try:
        result = approve_ticket(ticket_id, approved_by=body.approved_by)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except IllegalTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        logger.exception("Approval failed for ticket %s", ticket_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Approval failed: {exc}",
        )

    # Send Discord notification (non-blocking, best-effort)
    try:
        await send_discord_notification(
            {**result, "acted_by": body.approved_by},
            event="approved",
        )
    except Exception as exc:
        logger.error("Discord notification failed after approval: %s", exc)

    logger.info("Ticket %s approved by %s (legacy endpoint)", ticket_id, body.approved_by)
    return TransitionResponse(**result)


@router.post(
    "/{ticket_id}/reject",
    response_model=TransitionResponse,
    summary="Reject a ticket (DEPRECATED)",
    description="DEPRECATED: Use /api/v1/tickets/{ticket_id}/reject instead.",
    deprecated=True,
)
async def reject_legacy(ticket_id: str, body: ApprovalRequest):
    """Reject a pending ticket."""
    try:
        result = reject_ticket(ticket_id, rejected_by=body.approved_by)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except IllegalTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        logger.exception("Rejection failed for ticket %s", ticket_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rejection failed: {exc}",
        )

    # Send Discord notification
    try:
        await send_discord_notification(
            {**result, "acted_by": body.approved_by},
            event="rejected",
        )
    except Exception as exc:
        logger.error("Discord notification failed after rejection: %s", exc)

    logger.info("Ticket %s rejected by %s (legacy endpoint)", ticket_id, body.approved_by)
    return TransitionResponse(**result)


@router.post(
    "/{ticket_id}/transition",
    response_model=TransitionResponse,
    summary="Transition ticket status (DEPRECATED)",
    description=(
        "DEPRECATED: Use /api/v1/tickets/{ticket_id}/transition instead. "
        "Valid transitions: pending→awaiting_approval, awaiting_approval→approved/rejected, "
        "approved→filed, filed→resolved."
    ),
    deprecated=True,
)
async def transition_legacy(ticket_id: str, body: TransitionRequest):
    """Perform an arbitrary valid state transition."""
    try:
        result = transition_ticket(
            ticket_id,
            new_status=body.new_status,
            acted_by=body.acted_by,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except IllegalTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        logger.exception("Transition failed for ticket %s", ticket_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transition failed: {exc}",
        )

    # Send Discord notification
    try:
        await send_discord_notification(
            {**result, "acted_by": body.acted_by},
            event="status_change",
        )
    except Exception as exc:
        logger.error("Discord notification failed after transition: %s", exc)

    logger.info(
        "Ticket %s transitioned: %s → %s (by=%s, legacy endpoint)",
        ticket_id,
        result["old_status"],
        result["new_status"],
        body.acted_by,
    )
    return TransitionResponse(**result)
