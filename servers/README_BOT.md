# CivicFlow Telegram Bot

A production-grade Telegram bot for civic complaint triage in Bengaluru.

## Features

- **Emotional State Detection**: Understands user frustration/stress levels
- **Intent Classification**: Distinguishes complaint submissions from off-topic requests
- **Keyword Extraction**: Identifies civic issue categories
- **Laya Integration**: Routes to Laya classifier for department/authority assignment
- **Polite, Empathetic Responses**: Human-friendly interaction
- **Off-topic Refusal**: Stays focused on civic issues

## Setup

### 1. Get Bot Token from BotFather

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the instructions
3. Save the API token

### 2. Get Groq API Key

1. Go to https://console.groq.com/
2. Sign up/login
3. Create an API key from the dashboard

### 3. Configure Environment

```bash
cd servers

# Set environment variables
export TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
export GROQ_API_KEY="your_groq_api_key"
export CIVICFLOW_API_URL="http://localhost:8000"  # Backend API

# Optional: For production webhook mode
export TELEGRAM_WEBHOOK_URL="https://your-domain.com/telegram/webhook"
export TELEGRAM_WEBHOOK_SECRET="your_random_secret_string"
```

Or create a `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GROQ_API_KEY=your_groq_api_key
CIVICFLOW_API_URL=http://localhost:8000
```

### 4. Install Dependencies

```bash
cd servers
pip install -e .
```

### 5. Run the Bot

**Development (Polling Mode):**

```bash
python -m bot.main
```

**Production (Webhook Mode):**

```bash
# Set webhook URL first
export TELEGRAM_WEBHOOK_URL="https://your-domain.com/telegram/webhook"

# Run with webhook
python -m bot.main
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start a new conversation |
| `/help` | Show help message |
| `/status <id>` | Check complaint status |
| `/cancel` | Cancel current submission |

## Usage Examples

### Submitting a Complaint

```
User: There's a big pothole on MG Road near Trinity metro station

Bot: Oh no, that sounds concerning! 🚨 A pothole near Trinity metro could be dangerous for commuters. Let me note down the details:

📍 Location: MG Road near Trinity metro
🛣️ Issue: Large pothole

I'll submit this to BBMP Roads department. Would you like to add any additional details?

User: Yes, it's been there for 2 weeks and causing accidents

Bot: That's serious! I've marked this as HIGH urgency due to the safety risk. Your complaint has been submitted:

📋 Complaint ID: CF-A1B2C3D4
🏢 Department: ROADS (BBMP)
⚡ Urgency: High

You can track status with: /status CF-A1B2C3D4
```

### Off-topic Handling

```
User: What's the weather today?

Bot: I'm here to help with civic issues in Bengaluru only. I can help you with:

🛣️ Road problems (potholes, footpaths)
💧 Water issues (supply, leaks)
⚡ Electricity problems (outages)
🗑️ Sanitation issues (garbage, drains)

Is there a civic issue I can help you with? 🤝
```

## Architecture

```
User Message
     ↓
IntentAnalyzer
     ├─→ Keyword Extraction
     ├─→ Emotional State Detection
     └─→ LLM Intent Classification (Groq)
     ↓
Response Generation
     ├─→ Complaint details complete?
     │        ↓ Yes
     │   LayaClassifier
     │        ↓
     │   Submit to Backend API
     │        ↓
     │   Return complaint ID
     │
     └─→ Need more info?
              ↓
         Ask clarifying questions
```

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Required | Bot token from BotFather |
| `GROQ_API_KEY` | Required | Groq API key for LLM |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model to use |
| `GROQ_TEMPERATURE` | `0.7` | Response randomness (0-2) |
| `GROQ_MAX_TOKENS` | `1000` | Max tokens per response |
| `CIVICFLOW_API_URL` | `http://localhost:8000` | Backend API URL |
| `TELEGRAM_WEBHOOK_URL` | None | Webhook URL (production) |
| `TELEGRAM_WEBHOOK_SECRET` | `""` | Webhook secret token |
| `MAX_CONVERSATION_HISTORY` | `10` | Messages to remember |

## Testing

```bash
cd servers
pytest tests/unit/test_bot_*.py -v
```

## Deployment

### Option 1: Standalone Service

Run as a separate process:

```bash
python -m bot.main
```

### Option 2: Integrated with FastAPI

Add the webhook router to your FastAPI app:

```python
from bot.webhook import router as telegram_router, set_bot_application
from bot.main import create_application

# In your FastAPI app
app.include_router(telegram_router)

# Initialize bot on startup
@app.on_event("startup")
async def startup():
    bot_app = create_application()
    set_bot_application(bot_app)
```

## Monitoring

Check bot health:

```bash
# If using webhooks
curl http://localhost:8000/telegram/health
```

## Troubleshooting

**Bot not responding?**
1. Check `TELEGRAM_BOT_TOKEN` is correct
2. Verify `GROQ_API_KEY` is valid
3. Check backend API is running (`CIVICFLOW_API_URL`)
4. Review logs for errors

**Classification failing?**
- Backend API must be running
- Laya classifier must be available
- Check `CIVICFLOW_API_URL` is reachable

## License

MIT
