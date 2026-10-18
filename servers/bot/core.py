"""Core bot framework for multi-channel support."""

from __future__ import annotations

import logging
from typing import Any

from .handlers import get_handler
from .intents import Intent, IntentClassifier

logger = logging.getLogger("civicflow.bot.core")


class BotFramework:
    """Orchestrates message processing across channels (Telegram, Discord, etc.)."""

    def __init__(self, use_laya: bool = True):
        """Initialize bot framework.

        Args:
            use_laya: Whether to use Laya for intent classification.
        """
        self.intent_classifier = IntentClassifier(use_laya=use_laya)
        self._user_sessions: dict[str, dict[str, Any]] = {}

    async def process_message(
        self,
        text: str,
        user_id: str,
        channel: str = "telegram",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Process an incoming message and return response.

        Args:
            text: User message text.
            user_id: Unique user identifier.
            channel: Message channel (telegram, discord, etc.).
            metadata: Optional metadata (username, chat_id, etc.).

        Returns:
            Response dict with 'message', 'buttons', etc.
        """
        logger.info("Processing message from %s on %s: %s", user_id, channel, text[:50])

        # Get or create user session
        session = self._user_sessions.get(user_id, {})
        if not session:
            session = {
                "state": None,
                "context": {},
                "message_count": 0,
            }
            self._user_sessions[user_id] = session

        session["message_count"] += 1

        # Check for command
        if text.startswith("/"):
            response = await self._handle_command(text, user_id, session, metadata)
        else:
            # Classify intent
            intent, confidence = await self.intent_classifier.classify(text, metadata)
            logger.info("Classified intent: %s (conf=%.2f)", intent.value, confidence)

            # Get appropriate handler
            handler = get_handler(intent)
            response = await handler.handle(text, user_id, metadata)

        # Update session state
        if response.get("state"):
            session["state"] = response["state"]
        else:
            session["state"] = None

        # Add session info to response
        response["user_id"] = user_id
        response["channel"] = channel

        return response

    async def _handle_command(
        self,
        text: str,
        user_id: str,
        session: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Handle slash commands."""
        command = text.split()[0].lower()
        args = text.split(maxsplit=1)[1] if " " in text else None

        # Command routing
        if command == "/start":
            handler = get_handler(Intent.GREETING)
            return await handler.handle(text, user_id, {"is_new_user": session["message_count"] == 0})

        elif command == "/help":
            handler = get_handler(Intent.HELP)
            return await handler.handle(text, user_id, metadata)

        elif command == "/complaint":
            if args:
                # Direct complaint with text
                handler = get_handler(Intent.SUBMIT_COMPLAINT)
                return await handler.handle(args, user_id, metadata)
            else:
                return {
                    "message": (
                        "📝 *New Complaint*\n\n"
                        "Please describe your civic issue in detail.\n\n"
                        "Include:\n"
                        "• Type of issue (pothole, water leak, etc.)\n"
                        "• Location (area, road, landmark)\n"
                        "• Severity (when did it start?)\n\n"
                        "Example: 'Large pothole on MG Road near Trinity Metro station causing traffic jams'"
                    ),
                    "state": "awaiting_complaint",
                }

        elif command == "/status":
            if args:
                handler = get_handler(Intent.CHECK_STATUS)
                return await handler.handle(args, user_id, metadata)
            else:
                return {
                    "message": (
                        "🔍 *Check Ticket Status*\n\n"
                        "Please provide your ticket ID.\n\n"
                        "Example: `/status CF-A1B2C3`\n\n"
                        "Your ticket ID was provided when you submitted the complaint."
                    ),
                    "state": "awaiting_ticket_id",
                }

        elif command == "/cancel":
            handler = get_handler(Intent.CANCEL)
            return await handler.handle(text, user_id, metadata)

        else:
            return {
                "message": f"❓ Unknown command: {command}\n\nUse /help to see available commands.",
                "state": None,
            }

    def get_session(self, user_id: str) -> dict[str, Any] | None:
        """Get user session data."""
        return self._user_sessions.get(user_id)

    def clear_session(self, user_id: str) -> None:
        """Clear user session."""
        self._user_sessions.pop(user_id, None)
