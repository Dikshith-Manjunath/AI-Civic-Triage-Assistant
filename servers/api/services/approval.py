"""Approval engine — ticket lifecycle state machine and approval/rejection logic."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from api.db.clickhouse import get_client

logger = logging.getLogger("civicflow.approval")

# ── Ticket lifecycle state machine ──
# Map of: current_state → set of valid next states
TRANSITIONS: dict[str, set[str]] = {
    "pending": {"awaiting_approval"},
    "awaiting_approval": {"approved", "rejected"},
    "approved": {"filed"},
    "filed": {"resolved"},
    "rejected": set(),  # terminal state
    "resolved": set(),  # terminal state
}

VALID_STATUSES: set[str] = set(TRANSITIONS.keys())


class IllegalTransitionError(Exception):
    """Raised when an invalid state transition is attempted."""

    def __init__(self, current: str, requested: str) -> None:
        self.current = current
        self.requested = requested
        super().__init__(
            f"Illegal transition: '{current}' → '{requested}'. "
            f"Allowed from '{current}': {TRANSITIONS.get(current, set()) or 'none (terminal state)'}"
        )


def validate_transition(old_status: str, new_status: str) -> bool:
    """Check whether a state transition is legal.

    Args:
        old_status: Current ticket status.
        new_status: Requested next status.

    Returns:
        True if the transition is valid.

    Raises:
        IllegalTransitionError: If the transition is not allowed.
    """
    allowed = TRANSITIONS.get(old_status, set())
    if new_status not in allowed:
        raise IllegalTransitionError(old_status, new_status)
    logger.debug("Transition validated: %s → %s", old_status, new_status)
    return True


def _get_ticket_status(ticket_id: str) -> str | None:
    """Fetch current status of a ticket from ClickHouse."""
    client = get_client()
    result = client.query(
        "SELECT status FROM civic_complaints WHERE id = %(tid)s LIMIT 1",
        parameters={"tid": ticket_id},
    )
    if not result.result_rows:
        return None
    return result.result_rows[0][0]


def _update_ticket_status(
    ticket_id: str,
    new_status: str,
    approved_by: str = "",
    approved_at: datetime | None = None,
) -> None:
    """Update ticket status (and optionally approval metadata) in ClickHouse.

    ClickHouse MergeTree doesn't support UPDATE natively, so we use
    ALTER TABLE ... UPDATE which works on MergeTree family tables.
    """
    client = get_client()
    now = approved_at or datetime.now(UTC)

    if approved_by:
        client.command(
            "ALTER TABLE civic_complaints UPDATE "
            "status = %(new_status)s, "
            "approved_by = %(approved_by)s, "
            "approved_at = %(approved_at)s "
            "WHERE id = %(tid)s",
            parameters={
                "new_status": new_status,
                "approved_by": approved_by,
                "approved_at": now,
                "tid": ticket_id,
            },
        )
    else:
        client.command(
            "ALTER TABLE civic_complaints UPDATE status = %(new_status)s WHERE id = %(tid)s",
            parameters={
                "new_status": new_status,
                "tid": ticket_id,
            },
        )
    logger.info("Ticket %s status updated → %s", ticket_id, new_status)


def transition_ticket(
    ticket_id: str,
    new_status: str,
    acted_by: str = "",
) -> dict:
    """Perform a validated state transition on a ticket.

    Args:
        ticket_id: UUID of the ticket.
        new_status: Target status.
        acted_by: Who performed the action (for approve/reject).

    Returns:
        Dict with ticket_id, old_status, new_status, acted_by, timestamp.

    Raises:
        ValueError: If ticket not found.
        IllegalTransitionError: If transition is illegal.
    """
    current = _get_ticket_status(ticket_id)
    if current is None:
        raise ValueError(f"Ticket {ticket_id} not found")

    validate_transition(current, new_status)

    now = datetime.now(UTC)
    _update_ticket_status(
        ticket_id,
        new_status=new_status,
        approved_by=acted_by if new_status in ("approved", "rejected") else "",
        approved_at=now if new_status in ("approved", "rejected") else None,
    )

    logger.info(
        "Ticket %s transitioned: %s → %s (by=%s)",
        ticket_id,
        current,
        new_status,
        acted_by or "system",
    )

    return {
        "ticket_id": ticket_id,
        "old_status": current,
        "new_status": new_status,
        "acted_by": acted_by,
        "timestamp": now.isoformat(),
    }


def approve_ticket(ticket_id: str, approved_by: str) -> dict:
    """Approve a ticket (awaiting_approval → approved).

    Args:
        ticket_id: UUID of the ticket to approve.
        approved_by: Name/ID of the approver.

    Returns:
        Transition result dict.
    """
    logger.info("Approving ticket %s (by=%s)", ticket_id, approved_by)
    return transition_ticket(ticket_id, "approved", acted_by=approved_by)


def reject_ticket(ticket_id: str, rejected_by: str) -> dict:
    """Reject a ticket (awaiting_approval → rejected).

    Args:
        ticket_id: UUID of the ticket to reject.
        rejected_by: Name/ID of the rejector.

    Returns:
        Transition result dict.
    """
    logger.info("Rejecting ticket %s (by=%s)", ticket_id, rejected_by)
    return transition_ticket(ticket_id, "rejected", acted_by=rejected_by)
