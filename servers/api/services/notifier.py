"""Discord notifier — sends dept-scoped webhook notifications for ticket lifecycle events."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from api.config import settings

logger = logging.getLogger("civicflow.notifier")

# ── Urgency labels ──
_URGENCY_LABELS = {0: "🟢 Low", 1: "🟡 Medium", 2: "🔴 High"}
_URGENCY_COLORS = {0: 0x2ECC71, 1: 0xF1C40F, 2: 0xE74C3C}  # green, yellow, red


def _get_webhook_url(dept: str) -> str | None:
    """Resolve the Discord webhook URL for a given department.

    Falls back to the fallback webhook if the dept-specific one is not configured.
    Returns None if nothing is configured.
    """
    webhook_map: dict[str, str] = {
        "roads": settings.discord_webhook_roads,
        "water": settings.discord_webhook_water,
        "electricity": settings.discord_webhook_electricity,
        "sanitation": settings.discord_webhook_sanitation,
        "transport": settings.discord_webhook_transport,
        "housing": settings.discord_webhook_housing,
        "planning": settings.discord_webhook_planning,
    }

    url = webhook_map.get(dept, "").strip()
    if url:
        return url

    # Fallback webhook for unconfigured departments
    fallback = settings.discord_webhook_fallback.strip()
    if fallback:
        logger.debug("No webhook for dept=%s — using fallback webhook", dept)
        return fallback

    return None


async def send_discord_notification(
    ticket: dict[str, Any],
    event: str = "created",
) -> bool:
    """Send a notification to Discord via webhook.

    Args:
        ticket: Ticket data dict (id, dept, authority, urgency, summary, status, etc.)
        event: Event type — 'created', 'approved', 'rejected', 'status_change'.

    Returns:
        True if sent successfully, False otherwise.
    """
    webhook_url = _get_webhook_url(ticket.get("dept", ""))
    if not webhook_url:
        logger.warning(
            "No Discord webhook configured for dept=%s — skipping notification",
            ticket.get("dept", "unknown"),
        )
        return False

    # Build embed
    urgency = ticket.get("urgency", 1)
    urgency_label = _URGENCY_LABELS.get(urgency, "Unknown")
    color = _URGENCY_COLORS.get(urgency, 0x95A5A6)

    title_map = {
        "created": "🚨 New CivicFlow Ticket",
        "approved": "✅ Ticket Approved",
        "rejected": "❌ Ticket Rejected",
        "status_change": "🔄 Ticket Status Updated",
    }

    embed = {
        "title": title_map.get(event, "📋 CivicFlow Notification"),
        "color": color,
        "fields": [
            {"name": "Ticket ID", "value": f"`{ticket.get('id', 'N/A')}`", "inline": True},
            {"name": "Department", "value": ticket.get("dept", "N/A").capitalize(), "inline": True},
            {"name": "Authority", "value": ticket.get("authority", "N/A"), "inline": True},
            {"name": "Urgency", "value": urgency_label, "inline": True},
            {"name": "Status", "value": ticket.get("status", "N/A").replace("_", " ").title(), "inline": True},
            {"name": "Channel", "value": ticket.get("channel", "N/A").capitalize(), "inline": True},
            {"name": "Summary", "value": ticket.get("summary", "No summary")[:1024], "inline": False},
        ],
        "footer": {"text": "CivicFlow AI Triage System"},
    }

    # Add approver info for approval/rejection events
    if event in ("approved", "rejected") and ticket.get("acted_by"):
        embed["fields"].append({
            "name": "Approved By" if event == "approved" else "Rejected By",
            "value": ticket["acted_by"],
            "inline": True,
        })

    payload = {
        "username": "CivicFlow Bot",
        "embeds": [embed],
    }

    # For new ticket events, add interactive Approve / Reject buttons
    if event == "created":
        ticket_id = ticket.get("id", "")
        payload["components"] = [
            {
                "type": 1,  # Action Row
                "components": [
                    {
                        "type": 2,  # Button
                        "style": 3,  # Success (green)
                        "label": "Approve",
                        "custom_id": f"civicflow_approve:{ticket_id}",
                        "emoji": {"name": "\u2705"},
                    },
                    {
                        "type": 2,  # Button
                        "style": 4,  # Danger (red)
                        "label": "Reject",
                        "custom_id": f"civicflow_reject:{ticket_id}",
                        "emoji": {"name": "\u274c"},
                    },
                ],
            }
        ]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=payload)
            if response.status_code in (200, 204):
                logger.info(
                    "Discord notification sent [event=%s ticket=%s]",
                    event, ticket.get("id"),
                )
                return True
            else:
                logger.warning(
                    "Discord webhook returned %d: %s",
                    response.status_code, response.text[:200],
                )
                return False
    except Exception as exc:
        logger.error("Failed to send Discord notification: %s", exc)
        return False


async def send_approval_request(ticket: dict[str, Any]) -> bool:
    """Send a pending-approval notification to Discord.

    This is the primary hook called when a new ticket is created.
    """
    return await send_discord_notification(ticket, event="created")
