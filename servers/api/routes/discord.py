"""Discord Interactions router — handles button clicks (Approve / Reject) from Discord."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from api.config import settings
from api.services.approval import (
    IllegalTransitionError,
    approve_ticket,
    reject_ticket,
)
from api.services.notifier import send_discord_notification

logger = logging.getLogger("civicflow.routes.discord")

router = APIRouter(prefix="/v1/discord", tags=["discord"])


def _verify_signature(body: bytes, signature: str, timestamp: str) -> bool:
    """Verify a Discord interaction request using Ed25519.

    Args:
        body: Raw request body bytes.
        signature: Value of X-Signature-Ed25519 header.
        timestamp: Value of X-Signature-Timestamp header.

    Returns:
        True if valid, False otherwise.
    """
    public_key = settings.discord_public_key
    if not public_key:
        logger.warning("DISCORD_PUBLIC_KEY not configured — skipping verification")
        return True  # Allow in dev mode when key not set

    try:
        vk = VerifyKey(bytes.fromhex(public_key))
        vk.verify(timestamp.encode() + body, bytes.fromhex(signature))
        return True
    except (BadSignatureError, Exception) as exc:
        logger.warning("Discord signature verification failed: %s", exc)
        return False


@router.post(
    "/interactions",
    summary="Discord interaction webhook",
    description=(
        "Handles Discord interaction callbacks (button clicks). "
        "Verifies Ed25519 signatures and processes Approve/Reject actions."
    ),
)
async def discord_interactions(
    request: Request,
    x_signature_ed25519: str = Header("", alias="X-Signature-Ed25519"),
    x_signature_timestamp: str = Header("", alias="X-Signature-Timestamp"),
):
    """Handle Discord interaction webhook (button clicks)."""
    body = await request.body()

    # ── Verify Discord signature ──
    if not _verify_signature(body, x_signature_ed25519, x_signature_timestamp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid request signature",
        )

    payload = await request.json()
    interaction_type = payload.get("type")

    # ── Type 1: PING (Discord verification handshake) ──
    if interaction_type == 1:
        logger.info("Discord PING received — responding with PONG")
        return JSONResponse({"type": 1})

    # ── Type 3: MESSAGE_COMPONENT (button click) ──
    if interaction_type == 3:
        data = payload.get("data", {})
        custom_id = data.get("custom_id", "")
        discord_user = payload.get("member", {}).get("user", {})
        actor_name = discord_user.get("username", "discord_officer")

        logger.info(
            "Discord button interaction: custom_id=%s actor=%s",
            custom_id,
            actor_name,
        )

        # Parse custom_id format: "civicflow_approve:<ticket_id>" or "civicflow_reject:<ticket_id>"
        if ":" not in custom_id:
            logger.warning("Malformed custom_id: %s", custom_id)
            return JSONResponse(
                {
                    "type": 4,  # CHANNEL_MESSAGE_WITH_SOURCE
                    "data": {"content": "Invalid button action.", "flags": 64},
                }
            )

        action, ticket_id = custom_id.split(":", 1)

        try:
            if action == "civicflow_approve":
                result = approve_ticket(ticket_id, approved_by=actor_name)
                event = "approved"
                emoji = "\u2705"
                verb = "approved"
            elif action == "civicflow_reject":
                result = reject_ticket(ticket_id, rejected_by=actor_name)
                event = "rejected"
                emoji = "\u274c"
                verb = "rejected"
            else:
                logger.warning("Unknown action: %s", action)
                return JSONResponse(
                    {
                        "type": 4,
                        "data": {"content": f"Unknown action: {action}", "flags": 64},
                    }
                )

            # Send follow-up notification (best-effort)
            try:
                await send_discord_notification(
                    {**result, "acted_by": actor_name},
                    event=event,
                )
            except Exception as exc:
                logger.error("Follow-up notification failed: %s", exc)

            logger.info("Ticket %s %s by %s via Discord", ticket_id, verb, actor_name)

            return JSONResponse(
                {
                    "type": 4,  # CHANNEL_MESSAGE_WITH_SOURCE
                    "data": {
                        "content": (
                            f"{emoji} Ticket `{ticket_id}` has been **{verb}** by {actor_name}."
                        ),
                        "flags": 64,  # Ephemeral (only visible to clicker)
                    },
                }
            )

        except ValueError as exc:
            logger.warning("Ticket not found: %s", exc)
            return JSONResponse(
                {
                    "type": 4,
                    "data": {
                        "content": f"Ticket not found: {ticket_id}",
                        "flags": 64,
                    },
                }
            )
        except IllegalTransitionError as exc:
            logger.warning("Illegal transition: %s", exc)
            return JSONResponse(
                {
                    "type": 4,
                    "data": {
                        "content": f"Cannot {action.split('_')[1]}: {exc}",
                        "flags": 64,
                    },
                }
            )
        except Exception:
            logger.exception("Discord interaction handler error for ticket %s", ticket_id)
            return JSONResponse(
                {
                    "type": 4,
                    "data": {
                        "content": "Internal error processing action. Please try again.",
                        "flags": 64,
                    },
                }
            )

    # ── Unknown interaction type ──
    logger.warning("Unhandled Discord interaction type: %s", interaction_type)
    return JSONResponse({"type": 1})
