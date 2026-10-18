"""Discord bot integration for civic complaints.

This module provides a full Discord bot client (not just webhooks) for
interactive complaint submission and ticket management.
"""

from __future__ import annotations

import logging
from typing import Any

import discord
from discord import app_commands
from discord.ext import commands

from api.config import settings
from .core import BotFramework
from .handlers import get_handler
from .intents import Intent

logger = logging.getLogger("civicflow.bot.discord")

# Global instances
_bot_framework: BotFramework | None = None
_discord_bot: "CivicFlowDiscordBot" | None = None


def get_bot_framework() -> BotFramework:
    """Get or create bot framework instance."""
    global _bot_framework
    if _bot_framework is None:
        _bot_framework = BotFramework(use_laya=settings.laya_classifier_enabled)
    return _bot_framework


class CivicFlowDiscordBot(commands.Bot):
    """Discord bot for CivicFlow civic complaint system."""

    def __init__(self) -> None:
        """Initialize the Discord bot."""
        intents = discord.Intents.default()
        intents.message_content = True
        intents.messages = True

        super().__init__(
            command_prefix="!",
            intents=intents,
            description="CivicFlow - Bengaluru Civic Complaint Assistant",
        )

    async def setup_hook(self) -> None:
        """Setup hook called when bot starts."""
        # Sync slash commands with Discord
        try:
            synced = await self.tree.sync()
            logger.info("Synced %d slash commands", len(synced))
        except Exception as exc:
            logger.error("Failed to sync commands: %s", exc)

    async def on_ready(self) -> None:
        """Called when bot is connected and ready."""
        logger.info("Logged in as %s (ID: %d)", self.user.name, self.user.id)
        logger.info("Bot is ready in %d guilds", len(self.guilds))


# Create bot instance
bot = CivicFlowDiscordBot()


@bot.event
async def on_message(message: discord.Message) -> None:
    """Handle incoming messages."""
    # Ignore messages from bots or DMs (optional)
    if message.author.bot:
        return

    # Process commands first
    await bot.process_commands(message)

    # Check if message mentions the bot or is in a dedicated channel
    if bot.user.mentioned_in(message) or message.channel.name == "civicflow":
        framework = get_bot_framework()
        user_id = str(message.author.id)

        response = await framework.process_message(
            text=message.content,
            user_id=user_id,
            channel="discord",
            metadata={
                "username": message.author.name,
                "channel_id": message.channel.id,
                "guild_id": message.guild.id if message.guild else None,
            },
        )

        # Send response
        await message.reply(
            content=response.get("message", "An error occurred."),
            mention_author=False,
        )


# ── Slash Commands ──

@bot.tree.command(
    name="civicflow",
    description="Submit a new civic complaint",
)
@app_commands.describe(
    complaint="Describe your civic issue (location, problem, urgency)",
)
async def civicflow_command(interaction: discord.Interaction, complaint: str) -> None:
    """Handle /civicflow slash command for complaint submission."""
    framework = get_bot_framework()
    user_id = str(interaction.user.id)

    # Defer response for longer processing
    await interaction.response.defer(thinking=True)

    handler = get_handler(Intent.SUBMIT_COMPLAINT)
    response = await handler.handle(complaint, user_id, {"channel_id": interaction.channel_id})

    # Build embed for rich display
    embed = discord.Embed(
        title="📋 Complaint Received",
        description=response.get("message", "Your complaint has been submitted."),
        color=discord.Color.blue(),
    )

    if "ticket_id" in response:
        embed.add_field(name="Ticket ID", value=response["ticket_id"], inline=True)

    if "classification" in response:
        classification = response["classification"]
        embed.add_field(name="Department", value=classification["department"].title(), inline=True)
        embed.add_field(name="Authority", value=classification["authority"], inline=True)

        urgency_emoji = {0: "🟢", 1: "🟡", 2: "🔴"}
        urgency_label = {0: "Low", 1: "Medium", 2: "High"}
        urgency = classification["urgency"]
        embed.add_field(
            name="Urgency",
            value=f"{urgency_emoji.get(urgency, '⚪')} {urgency_label.get(urgency, 'Medium')}",
            inline=True,
        )

    await interaction.followup.send(embed=embed)


@bot.tree.command(
    name="status",
    description="Check the status of a ticket",
)
@app_commands.describe(
    ticket_id="Your ticket ID (e.g., CF-A1B2C3)",
)
async def status_command(interaction: discord.Interaction, ticket_id: str) -> None:
    """Handle /status slash command for ticket status check."""
    framework = get_bot_framework()
    user_id = str(interaction.user.id)

    handler = get_handler(Intent.CHECK_STATUS)
    response = await handler.handle(ticket_id, user_id, {"channel_id": interaction.channel_id})

    # Build embed
    embed = discord.Embed(
        title=f"🎫 Ticket Status: {ticket_id}",
        description=response.get("message", "Ticket not found."),
        color=discord.Color.orange(),
    )

    await interaction.response.send_message(embed=embed)


@bot.tree.command(
    name="civicflow-help",
    description="Get help with CivicFlow bot commands",
)
async def help_command(interaction: discord.Interaction) -> None:
    """Handle /civicflow-help slash command."""
    handler = get_handler(Intent.HELP)
    response = await handler.handle("/help", str(interaction.user.id), {})

    embed = discord.Embed(
        title="📖 CivicFlow Help",
        description=response.get("message", ""),
        color=discord.Color.green(),
    )

    await interaction.response.send_message(embed=embed)


def run_discord_bot(token: str | None = None) -> None:
    """Run the Discord bot.

    Args:
        token: Discord bot token. If None, reads from settings.
    """
    token = token or settings.discord_bot_token

    if not token:
        raise ValueError("Discord bot token is required. Set DISCORD_BOT_TOKEN in environment.")

    # Initialize bot framework
    get_bot_framework()

    logger.info("Starting Discord bot...")
    bot.run(token)


def main() -> None:
    """Entry point for running the Discord bot."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )

    try:
        run_discord_bot()
    except ValueError as e:
        logger.error("Configuration error: %s", e)
        logger.info("To set up a Discord bot:")
        logger.info("1. Go to https://discord.com/developers/applications")
        logger.info("2. Create a new application")
        logger.info("3. Go to Bot section and create a bot")
        logger.info("4. Copy the token and set DISCORD_BOT_TOKEN in your .env file")
        raise SystemExit(1)
    except Exception as e:
        logger.exception("Bot failed to start: %s", e)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
