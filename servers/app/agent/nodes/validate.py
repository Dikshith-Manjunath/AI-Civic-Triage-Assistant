"""Validation node: ensure LLM output meets schema requirements."""

from __future__ import annotations

import structlog

logger = structlog.get_logger()

VALID_DEPARTMENTS = {
    "water", "roads", "sanitation", "electricity", "parks",
    "building", "traffic", "public_health", "general",
}


async def validate_ticket(state: dict) -> dict:
    """Validate the triaged ticket output from the LLM."""
    log = logger.bind(complaint_id=state["complaint_id"])
    errors = []

    # Department validation
    dept = state.get("department", "")
    if dept not in VALID_DEPARTMENTS:
        errors.append(f"Invalid department: {dept}")

    # Urgency validation
    urgency = state.get("urgency")
    if urgency not in (0, 1, 2):
        errors.append(f"Invalid urgency: {urgency}")

    # Summary validation
    summary = state.get("summary", "")
    if not summary or len(summary) < 10:
        errors.append("Summary too short or empty")
    if len(summary) > 500:
        errors.append("Summary too long (>500 chars)")

    # Citizen reply validation
    reply = state.get("citizen_reply", "")
    if not reply or len(reply) < 10:
        errors.append("Citizen reply too short or empty")

    is_valid = len(errors) == 0

    if is_valid:
        log.info("Ticket validated successfully")
    else:
        log.warning("Ticket validation failed", errors=errors, retry=state.get("retry_count", 0))

    return {
        **state,
        "is_valid": is_valid,
        "validation_errors": errors,
    }
