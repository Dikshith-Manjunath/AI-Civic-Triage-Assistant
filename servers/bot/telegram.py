"""Telegram bot integration using python-telegram-bot."""

from __future__ import annotations

import logging
import os
from typing import Any

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from api.config import settings
from .core import BotFramework
from .handlers import get_handler
from .intents import Intent

logger = logging.getLogger("civicflow.bot.telegram")

# Global bot framework instance
_bot_framework: BotFramework | None = None


def get_bot_framework() -> BotFramework:
    """Get or create bot framework instance."""
    global _bot_framework
    if _bot_framework is None:
        _bot_framework = BotFramework(use_laya=settings.laya_classifier_enabled)
    return _bot_framework


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command."""
    user_id = str(update.effective_user.id)
    framework = get_bot_framework()

    response = await framework.process_message(
        text="/start",
        user_id=user_id,
        channel="telegram",
        metadata={
            "username": update.effective_user.username,
            "first_name": update.effective_user.first_name,
            "chat_id": update.effective_chat.id,
        },
    )

    await _send_response(update, response)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /help command."""
    user_id = str(update.effective_user.id)
    framework = get_bot_framework()

    response = await framework.process_message(
        text="/help",
        user_id=user_id,
        channel="telegram",
        metadata={"chat_id": update.effective_chat.id},
    )

    await _send_response(update, response)


async def complaint_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /complaint command."""
    user_id = str(update.effective_user.id)
    framework = get_bot_framework()

    # Get complaint text from command args
    complaint_text = " ".join(context.args) if context.args else ""

    if complaint_text:
        response = await framework.process_message(
            text=f"/complaint {complaint_text}",
            user_id=user_id,
            channel="telegram",
            metadata={"chat_id": update.effective_chat.id},
        )
    else:
        response = await framework.process_message(
            text="/complaint",
            user_id=user_id,
            channel="telegram",
            metadata={"chat_id": update.effective_chat.id},
        )

    await _send_response(update, response)


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /status command."""
    user_id = str(update.effective_user.id)
    framework = get_bot_framework()

    ticket_id = " ".join(context.args) if context.args else ""

    response = await framework.process_message(
        text=f"/status {ticket_id}" if ticket_id else "/status",
        user_id=user_id,
        channel="telegram",
        metadata={"chat_id": update.effective_chat.id},
    )

    await _send_response(update, response)


async def cancel_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /cancel command."""
    user_id = str(update.effective_user.id)
    framework = get_bot_framework()

    response = await framework.process_message(
        text="/cancel",
        user_id=user_id,
        channel="telegram",
        metadata={"chat_id": update.effective_chat.id},
    )

    await _send_response(update, response)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle regular text messages."""
    if not update.message or not update.message.text:
        return

    user_id = str(update.effective_user.id)
    text = update.message.text
    framework = get_bot_framework()

    # Check session state for multi-turn conversations
    session = framework.get_session(user_id)
    session_state = session.get("state") if session else None

    # If awaiting complaint text, treat as complaint submission
    if session_state == "awaiting_complaint":
        handler = get_handler(Intent.SUBMIT_COMPLAINT)
        response = await handler.handle(text, user_id, {"chat_id": update.effective_chat.id})
    elif session_state == "awaiting_ticket_id":
        handler = get_handler(Intent.CHECK_STATUS)
        response = await handler.handle(text, user_id, {"chat_id": update.effective_chat.id})
    else:
        # Normal intent classification
        response = await framework.process_message(
            text=text,
            user_id=user_id,
            channel="telegram",
            metadata={
                "username": update.effective_user.username,
                "first_name": update.effective_user.first_name,
                "chat_id": update.effective_chat.id,
            },
        )

    await _send_response(update, response)


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle inline button callbacks."""
    query = update.callback_query
    await query.answer()

    user_id = str(update.effective_user.id)
    callback_data = query.data
    framework = get_bot_framework()

    # Map callback data to commands
    callback_map = {
        "new_complaint": "/complaint",
        "check_status": "/status",
        "get_info": "/help",
        "cancel": "/cancel",
    }

    command = callback_map.get(callback_data, f"unknown_{callback_data}")

    response = await framework.process_message(
        text=command,
        user_id=user_id,
        channel="telegram",
        metadata={
            "chat_id": update.effective_chat.id,
            "callback": True,
        },
    )

    # Edit the message instead of sending new one
    await query.edit_message_text(
        text=response["message"],
        parse_mode=ParseMode.MARKDOWN,
    )


async def _send_response(update: Update, response: dict[str, Any]) -> None:
    """Send response to user with optional inline buttons."""
    message = response.get("message", "An error occurred.")
    buttons = response.get("buttons")

    if buttons:
        # Convert button format to Telegram's InlineKeyboardMarkup
        keyboard = []
        for row in buttons:
            keyboard_row = []
            for btn in row:
                keyboard_row.append(
                    InlineKeyboardButton(
                        text=btn["text"],
                        callback_data=btn["callback_data"],
                    )
                )
            keyboard.append(keyboard_row)

        reply_markup = InlineKeyboardMarkup(keyboard)
    else:
        reply_markup = None

    await update.message.reply_text(
        text=message,
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=reply_markup,
        disable_web_page_preview=True,
    )


def run_telegram_bot(token: str | None = None, webhook_url: str | None = None) -> None:
    """Run the Telegram bot.

    Args:
        token: Bot token from @BotFather. If None, reads from settings.
        webhook_url: Optional webhook URL for production. If None, uses polling.
    """
    token = token or settings.telegram_bot_token

    if not token:
        raise ValueError("Telegram bot token is required. Set TELEGRAM_BOT_TOKEN in environment.")

    # Create application
    application = Application.builder().token(token).build()

    # Register command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("complaint", complaint_command))
    application.add_handler(CommandHandler("status", status_command))
    application.add_handler(CommandHandler("cancel", cancel_command))

    # Register message handler for non-command messages
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Register callback handler for inline buttons
    application.add_handler(CallbackQueryHandler(handle_callback))

    # Initialize bot framework
    get_bot_framework()

    logger.info("Starting Telegram bot...")

    if webhook_url:
        # Webhook mode for production
        application.run_webhook(
            listen="0.0.0.0",
            port=8443,
            url_path=token,
            webhook_url=f"{webhook_url}/{token}",
        )
    else:
        # Polling mode for development
        application.run_polling(allowed_updates=Update.ALL_TYPES)


def main() -> None:
    """Entry point for running the Telegram bot."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )

    try:
        run_telegram_bot()
    except ValueError as e:
        logger.error("Configuration error: %s", e)
        logger.info("To set up a Telegram bot:")
        logger.info("1. Message @BotFather on Telegram")
        logger.info("2. Use /newbot to create a new bot")
        logger.info("3. Copy the token and set TELEGRAM_BOT_TOKEN in your .env file")
        raise SystemExit(1)
    except Exception as e:
        logger.exception("Bot failed to start: %s", e)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
