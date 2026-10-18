"""Ticket lifecycle router — v1 API endpoint for ticket status management.

Handles approve, reject, and generic status transitions for tickets.

Version: 1.0.0
Stability: Stable
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from api.services.approval import (
    IllegalTransitionError,
    approve_ticket,
    reject_ticket,
    transition_ticket,
)
from api.services.notifier import send_discord_notification

logger = logging.getLogger("civicflow.routes.v1.tickets")

router = APIRouter(prefix="/tickets", tags=["tickets"])


# ── Request / Response models ──


class ApprovalRequest(BaseModel):
    """Body for approve/reject endpoints."""

    approved_by: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name or ID of the approver",
    )
    notes: str | None = Field(
        None,
        max_length=1000,
        description="Optional notes about the approval/rejection",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "approved_by": "inspector_rajesh",
                    "notes": "Verified complaint. Pothole is dangerous and needs immediate repair."
                }
            ]
        }
    }


class TransitionRequest(BaseModel):
    """Body for generic status transition."""

    new_status: str = Field(
        ...,
        min_length=1,
        description="Target status (awaiting_approval, approved, rejected, filed, resolved)"
    )
    acted_by: str = Field(
        "system",
        max_length=100,
        description="Who triggered the transition"
    )
    notes: str | None = Field(
        None,
        max_length=1000,
        description="Optional notes about the transition"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "new_status": "filed",
                    "acted_by": "auto_system",
                    "notes": "Ticket automatically filed after approval timeout"
                }
            ]
        }
    }


class TransitionResponse(BaseModel):
    """Response after a status transition."""

    ticket_id: str = Field(..., description="Ticket ID")
    old_status: str = Field(..., description="Previous status")
    new_status: str = Field(..., description="New status")
    acted_by: str = Field(..., description="Who performed the action")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    notes: str | None = Field(None, description="Transition notes")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ticket_id": "550e8400-e29b-41d4-a716-446655440000",
                    "old_status": "awaiting_approval",
                    "new_status": "approved",
                    "acted_by": "inspector_rajesh",
                    "timestamp": "2024-12-15T10:30:00Z",
                    "notes": "Verified and approved"
                }
            ]
        }
    }


# ── Valid Statuses ──

VALID_STATUSES = {
    "pending",
    "awaiting_approval",
    "approved",
    "rejected",
    "filed",
    "resolved",
}


# ── Endpoints ──


@router.post(
    "/{ticket_id}/approve",
    response_model=TransitionResponse,
    summary="Approve a ticket",
    description=(
        "Transition a ticket from awaiting_approval to approved.\n\n"
        "**Valid Transitions:**\n"
        "- awaiting_approval → approved\n\n"
        "After approval, the ticket can be transitioned to 'filed' and then 'resolved'."
    ),
    responses={
        200: {
            "description": "Ticket approved successfully",
            "model": TransitionResponse,
        },
        404: {
            "description": "Ticket not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Ticket 550e8400 not found"}
                }
            },
        },
        409: {
            "description": "Invalid status transition",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Cannot approve ticket with status 'pending'. Must be in 'awaiting_approval' state."
                    }
                }
            },
        },
    },
)
async def approve(ticket_id: str, body: ApprovalRequest):
    """
    Approve a pending ticket.

    Valid transitions: awaiting_approval → approved
    """
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

    logger.info("Ticket %s approved by %s", ticket_id, body.approved_by)
    return TransitionResponse(**result, notes=body.notes)


@router.post(
    "/{ticket_id}/reject",
    response_model=TransitionResponse,
    summary="Reject a ticket",
    description=(
        "Transition a ticket from awaiting_approval to rejected.\n\n"
        "**Valid Transitions:**\n"
        "- awaiting_approval → rejected\n\n"
        "Rejected tickets cannot be transitioned further."
    ),
    responses={
        200: {
            "description": "Ticket rejected",
            "model": TransitionResponse,
        },
        404: {
            "description": "Ticket not found",
        },
        409: {
            "description": "Invalid status transition",
        },
    },
)
async def reject(ticket_id: str, body: ApprovalRequest):
    """
    Reject a pending ticket.

    Valid transitions: awaiting_approval → rejected
    """
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

    logger.info("Ticket %s rejected by %s", ticket_id, body.approved_by)
    return TransitionResponse(**result, notes=body.notes)


@router.post(
    "/{ticket_id}/transition",
    response_model=TransitionResponse,
    summary="Transition ticket status",
    description=(
        "Generic state transition endpoint.\n\n"
        "**Valid Transitions:**\n"
        "- pending → awaiting_approval\n"
        "- awaiting_approval → approved | rejected\n"
        "- approved → filed\n"
        "- filed → resolved\n\n"
        "**Status Meanings:**\n"
        "- pending: Awaiting system processing\n"
        "- awaiting_approval: Queued for human review\n"
        "- approved: Verified and ready for filing\n"
        "- rejected: Denied, no further action\n"
        "- filed: Officially registered with department\n"
        "- resolved: Issue has been addressed"
    ),
    responses={
        200: {
            "description": "Status transition successful",
            "model": TransitionResponse,
        },
        400: {
            "description": "Invalid status value",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Invalid status 'invalid'. Valid statuses: pending, awaiting_approval, approved, rejected, filed, resolved"
                    }
                }
            },
        },
        404: {
            "description": "Ticket not found",
        },
        409: {
            "description": "Invalid status transition",
        },
    },
)
async def transition(ticket_id: str, body: TransitionRequest):
    """
    Perform an arbitrary valid state transition.

    See description for valid transitions.
    """
    # Validate status
    if body.new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{body.new_status}'. Valid statuses: {', '.join(sorted(VALID_STATUSES))}",
        )

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
        "Ticket %s transitioned: %s → %s (by=%s)",
        ticket_id,
        result["old_status"],
        result["new_status"],
        body.acted_by,
    )
    return TransitionResponse(**result, notes=body.notes)
