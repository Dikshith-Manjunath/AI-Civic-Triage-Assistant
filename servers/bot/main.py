"""Main entry point for the CivicFlow Telegram Bot.

Run with:
    python -m bot.main

Or with environment variables:
    TELEGRAM_BOT_TOKEN=xxx GROQ_API_KEY=xxx python -m bot.main
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from bot.config import get_bot_settings
from bot.handlers import (
    start_command,
    help_command,
    cancel_command,
    status_command,
    handle_message,
    error_handler,
)
from bot.groq_client import close_groq_client
from bot.classifier import close_classifier

# ── Logging Setup ──

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("civicflow.bot")


def create_application() -> Application:
    """Create and configure the bot application."""
    settings = get_bot_settings()

    # Validate configuration
    settings.validate_or_raise()

    # Create application
    application = Application.builder().token(settings.telegram_bot_token).build()

    # Add command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("cancel", cancel_command))
    application.add_handler(CommandHandler("status", status_command))

    # Add message handler for all text messages
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )

    # Add error handler
    application.add_error_handler(error_handler)

    logger.info("Bot application configured")

    return application


async def post_shutdown(application: Application):
    """Cleanup after shutdown."""
    logger.info("Shutting down bot...")
    await close_groq_client()
    await close_classifier()
    logger.info("Bot shutdown complete")


def main():
    """Run the bot."""
    settings = get_bot_settings()

    # Validate configuration
    if not settings.telegram_bot_token:
        logger.error("TELEGRAM_BOT_TOKEN is required")
        sys.exit(1)

    if not settings.groq_api_key:
        logger.error("GROQ_API_KEY is required")
        sys.exit(1)

    logger.info("Starting CivicFlow Telegram Bot...")
    logger.info("Groq model: %s", settings.groq_model)

    # Create application
    application = create_application()

    # Set post_shutdown callback
    application.post_shutdown = post_shutdown

    # Run the bot
    if settings.telegram_webhook_url:
        # Webhook mode (for production)
        logger.info("Running in webhook mode: %s", settings.telegram_webhook_url)
        application.run_webhook(
            listen="0.0.0.0",
            port=8443,
            webhook_url=settings.telegram_webhook_url,
            secret_token=settings.telegram_webhook_secret,
        )
    else:
        # Polling mode (for development)
        logger.info("Running in polling mode")
        application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True,
        )


if __name__ == "__main__":
    main()
