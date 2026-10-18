"""Message handlers for the Telegram bot.

Handles:
- User messages
- Complaint submission flow
- Status checks
- Off-topic refusal
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from telegram import Update
from telegram.ext import ContextTypes

from bot.config import get_bot_settings
from bot.groq_client import get_groq_client
from bot.intent import get_intent_analyzer, IntentAnalyzer
from bot.classifier import get_classifier, LayaClassifier
from bot.prompts import TEMPLATES

logger = logging.getLogger("civicflow.bot.handlers")


# ── Conversation State Management ──

# In-memory conversation state (use Redis in production)
_conversation_state: dict[str, dict[str, Any]] = {}


def get_conversation_state(user_id: str) -> dict[str, Any]:
    """Get conversation state for a user."""
    return _conversation_state.setdefault(
        user_id,
        {
            "stage": "initial",
            "complaint_text": None,
            "location": None,
            "classification": None,
            "history": [],
        },
    )


def clear_conversation_state(user_id: str):
    """Clear conversation state for a user."""
    if user_id in _conversation_state:
        del _conversation_state[user_id]


# ── Command Handlers ──


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    user_id = str(update.effective_user.id)
    clear_conversation_state(user_id)

    await update.message.reply_text(
        TEMPLATES["welcome"],
        parse_mode=None,
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    help_text = """🤖 *CivicFlow Bot Help*

I help you report civic issues in Bengaluru.

*How to use:*
1. Simply describe your issue (e.g., "Large pothole on MG Road")
2. I'll understand and help you submit a complaint
3. You'll get a complaint ID to track status

*Commands:*
/start - Start a new conversation
/help - Show this help message
/status <id> - Check complaint status
/cancel - Cancel current submission

*Examples:*
• "There's a pothole near my house"
• "No water supply for 3 days"
• "Street light not working"

I'll guide you through the rest! 🙏
"""
    await update.message.reply_text(help_text, parse_mode=None)


async def cancel_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /cancel command."""
    user_id = str(update.effective_user.id)
    clear_conversation_state(user_id)

    await update.message.reply_text(
        "❌ Cancelled. Start a new complaint anytime with /start"
    )


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command."""
    args = context.args

    if not args:
        await update.message.reply_text(
            "Please provide a complaint ID:\n/status CF-ABC123",
            parse_mode=None,
        )
        return

    complaint_id = args[0]

    # TODO: Implement status check via API
    await update.message.reply_text(
        f"🔍 Checking status for complaint {complaint_id}...\n\n"
        f"This feature is coming soon! For now, check your complaint status at:\n"
        f"https://civicflow.in/status/{complaint_id}",
        parse_mode=None,
    )


# ── Message Handler ──


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle all text messages."""
    if not update.message or not update.message.text:
        return

    user_id = str(update.effective_user.id)
    user_name = update.effective_user.first_name or "there"
    text = update.message.text

    logger.info("Message from %s: %s", user_id, text[:100])

    # Get conversation state
    state = get_conversation_state(user_id)

    # Append to history
    state["history"].append({"role": "user", "content": text})
    # Keep only last 10 messages
    state["history"] = state["history"][-10:]

    try:
        # Analyze intent
        analyzer = get_intent_analyzer()
        analysis = await analyzer.analyze(text)

        intent = analysis["intent"]
        emotional_state = analysis["emotional_state"]
        is_urgent = analysis["is_urgent"]
        is_stressed = analysis["is_stressed"]

        logger.info(
            "Intent: %s | Emotional: %s | Urgent: %s",
            intent,
            emotional_state,
            is_urgent,
        )

        # Handle based on intent
        if intent == "off_topic":
            response = TEMPLATES["off_topic_refusal"]

        elif intent == "greeting":
            response = f"👋 Hello {user_name}! I'm here to help you report civic issues in Bengaluru. What issue would you like to report today?"

        elif intent == "submit_complaint" or analysis.get("keywords"):
            # Process complaint submission
            response = await _handle_complaint_submission(
                text=text,
                analysis=analysis,
                state=state,
                user_id=user_id,
            )

        else:
            # Use LLM for response
            groq = await get_groq_client()
            response = await groq.generate_response(
                user_message=text,
                conversation_history=state["history"],
            )

        # Add response to history
        state["history"].append({"role": "assistant", "content": response})

        # Send response without Markdown to avoid parsing issues
        # Telegram Markdown is very strict about escaping
        await update.message.reply_text(response, parse_mode=None)

    except Exception as exc:
        logger.exception("Failed to handle message")
        await update.message.reply_text(
            TEMPLATES["error_fallback"],
            parse_mode=None,
        )


async def _handle_complaint_submission(
    text: str,
    analysis: dict[str, Any],
    state: dict[str, Any],
    user_id: str,
) -> str:
    """Handle complaint submission flow.

    Args:
        text: User message
        analysis: Intent analysis result
        state: Conversation state
        user_id: Telegram user ID

    Returns:
        Response text
    """
    stage = state.get("stage", "initial")

    # Check for COMPLAINT_READY marker
    groq = await get_groq_client()
    llm_response = await groq.generate_response(
        user_message=text,
        conversation_history=state["history"],
    )

    # Look for complaint-ready marker
    if "COMPLAINT_READY:" in llm_response:
        # Extract JSON
        try:
            # Try to find JSON block
            json_start = llm_response.find("COMPLAINT_READY:\n")
            if json_start == -1:
                json_start = llm_response.find("COMPLAINT_READY:")

            json_start = llm_response.find("{", json_start)
            if json_start == -1:
                # No JSON found, just use the response
                return llm_response.replace("COMPLAINT_READY:", "").strip()

            # Find matching closing brace
            brace_count = 0
            json_end = json_start
            for i, char in enumerate(llm_response[json_start:]):
                if char == "{":
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = json_start + i + 1
                        break

            json_str = llm_response[json_start:json_end]
            complaint_data = json.loads(json_str)

            # Submit to classifier
            classifier = await get_classifier()

            classification = await classifier.classify(
                text=text,
                keywords=analysis.get("keywords"),
                location=complaint_data.get("location"),
                urgency_hint=analysis.get("urgency_level"),
            )

            # Submit complaint
            result = await classifier.submit_complaint(
                text=text,
                classification=classification,
                user_id=user_id,
                location=complaint_data.get("location"),
            )

            if result.get("success"):
                # Clear state
                clear_conversation_state(user_id)

                return TEMPLATES["complaint_submitted"].format(
                    complaint_id=result.get("complaint_id", "N/A"),
                    department=classification["department"].upper(),
                    authority=classification["authority"],
                    urgency=["Low", "Medium", "High"][classification["urgency"]],
                )
            else:
                return TEMPLATES["complaint_failed"]

        except (json.JSONDecodeError, KeyError) as exc:
            logger.error("Failed to parse complaint data: %s", exc)
            # Fall through to normal response - just clean it up

    # Not ready to submit, use LLM response
    # Clean up any JSON markers and code blocks from the response
    response = re.sub(r"```json\n\{[\s\S]*?\}\n```", "", llm_response)
    response = re.sub(r"```\n\{[\s\S]*?\}\n```", "", response)
    response = re.sub(r"COMPLAINT_READY:[\s\S]*", "", response)
    # Remove any remaining backtick blocks
    response = re.sub(r"```[\s\S]*?```", "", response)

    return response.strip()


# ── Error Handler ──


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    """Handle errors."""
    logger.error("Exception while handling update:", exc_info=context.error)

    if isinstance(update, Update) and update.message:
        await update.message.reply_text(
            "😅 Something went wrong. Please try again.",
        )
