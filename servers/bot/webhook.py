"""FastAPI webhook endpoint for Telegram bot.

This provides a webhook endpoint for the Telegram bot
instead of long polling. Use this in production.

Endpoints:
- POST /telegram/webhook - Receive updates from Telegram
- GET /telegram/health - Health check
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response, status
from pydantic import BaseModel

from telegram import Update

logger = logging.getLogger("civicflow.bot.webhook")

router = APIRouter(prefix="/telegram", tags=["telegram-bot"])


# ── Global Application Instance ──

_bot_app = None


def set_bot_application(app):
    """Set the bot application instance."""
    global _bot_app
    _bot_app = app


async def get_bot_application():
    """Get the bot application instance."""
    if _bot_app is None:
        raise RuntimeError("Bot application not initialized")
    return _bot_app


# ── Webhook Endpoints ──


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "telegram-bot"}


@router.post("/webhook")
async def webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle incoming Telegram updates.

    This endpoint receives updates from Telegram and processes them
    in a background task to avoid blocking.
    """
    try:
        # Parse the update
        data = await request.json()
        update = Update.de_json(data, None)

        if not update:
            logger.warning("Received empty update")
            return Response(status_code=status.HTTP_200_OK)

        # Get bot application
        app = await get_bot_application()

        # Process update in background
        background_tasks.add_task(app.process_update, update)

        return Response(status_code=status.HTTP_200_OK)

    except Exception as exc:
        logger.exception("Failed to process webhook update")
        return Response(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.get("/set_webhook")
async def set_webhook(request: Request):
    """Set the webhook URL for the bot.

    This is a convenience endpoint for setting the webhook.
    Should be protected in production.
    """
    from bot.config import get_bot_settings

    settings = get_bot_settings()

    if not settings.telegram_webhook_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TELEGRAM_WEBHOOK_URL not configured",
        )

    try:
        app = await get_bot_application()
        success = await app.bot.set_webhook(
            url=settings.telegram_webhook_url,
            secret_token=settings.telegram_webhook_secret,
        )

        return {
            "success": success,
            "webhook_url": settings.telegram_webhook_url,
        }

    except Exception as exc:
        logger.exception("Failed to set webhook")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


@router.get("/webhook_info")
async def webhook_info(request: Request):
    """Get current webhook info."""
    try:
        app = await get_bot_application()
        info = await app.bot.get_webhook_info()

        return {
            "url": info.url,
            "has_custom_certificate": info.has_custom_certificate,
            "pending_update_count": info.pending_update_count,
            "last_error_date": info.last_error_date,
            "last_error_message": info.last_error_message,
            "max_connections": info.max_connections,
        }

    except Exception as exc:
        logger.exception("Failed to get webhook info")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


@router.get("/delete_webhook")
async def delete_webhook(request: Request):
    """Delete the webhook to switch to polling mode."""
    try:
        app = await get_bot_application()
        success = await app.bot.delete_webhook()

        return {"success": success, "message": "Webhook deleted"}

    except Exception as exc:
        logger.exception("Failed to delete webhook")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
