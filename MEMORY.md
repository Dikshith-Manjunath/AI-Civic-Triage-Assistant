# CivicFlow Project Memory

> Context file for maintaining project state across sessions

## Project Overview

**CivicFlow** - AI-powered civic issue triage system for Bengaluru, India. Processes citizen complaints through multiple channels (API, Telegram, Discord) and automatically classifies them to appropriate departments and authorities.

### Current Version: 0.7.0

---

## Architecture Progress

### ✅ Phase 1-4: Complete

1. **Infrastructure Foundation**
   - Redis caching with connection pooling
   - Docker Compose setup with all services
   - Environment configuration

2. **Laya Classifier Integration**
   - Local SDK mode (preferred) and HTTP fallback
   - Multilingual support (Kannada, Hindi, English, Tamil, Telugu)
   - Rule-based fallback when Laya unavailable

3. **Custom Chatbot Agent**
   - Unified bot framework (`servers/bot/`)
   - Telegram integration (`python-telegram-bot>=21.0`)
   - Discord bot with slash commands
   - Intent classification and routing

4. **Security & Privacy Hardening**
   - PII detection (Aadhaar, PAN, phone, email, etc.)
   - AES-256-GCM encryption for sensitive data
   - Redis-based rate limiting with sliding window
   - IP whitelist/blacklist middleware

### 🔄 Phase 5: Performance & Reliability (In Progress)

**Completed:**
- ✅ Circuit breaker middleware (`servers/api/middleware/circuit_breaker.py`)
- ✅ Prometheus metrics collection (`servers/api/services/metrics.py`)
- ✅ Enhanced health endpoint with circuit breaker stats
- ✅ `/metrics` endpoint for Prometheus scraping
- ✅ Integrated circuit breaker into classifier service

**Remaining:**
- [ ] Connection pooling for ClickHouse
- [ ] Enhanced Kafka consumer with DLQ

### 📋 Phase 6-10: Upcoming

- Phase 6: Observability & Monitoring (OpenTelemetry tracing)
- Phase 7: API Documentation & Versioning
- Phase 8: Telegram Bot Specific Features
- Phase 9: Cloud Deployment Preparation
- Phase 10: Testing & Quality Assurance

---

## Key Files Reference

### Core Services

| File | Purpose |
|------|---------|
| `servers/api/main.py` | FastAPI application entry point |
| `servers/api/config.py` | Settings and configuration |
| `servers/api/services/classifier.py` | Laya SDK/HTTP classification |
| `servers/api/services/cache.py` | Redis caching service |
| `servers/api/services/metrics.py` | Prometheus metrics |
| `servers/api/services/pii_detector.py` | PII detection & encryption |

### Middleware

| File | Purpose |
|------|---------|
| `servers/api/middleware/rate_limit.py` | Redis sliding window rate limiter |
| `servers/api/middleware/circuit_breaker.py` | Circuit breaker pattern |

### Bot Framework

| File | Purpose |
|------|---------|
| `servers/bot/core.py` | Bot orchestrator |
| `servers/bot/intents.py` | Intent classification |
| `servers/bot/handlers.py` | Message handlers |
| `servers/bot/telegram.py` | Telegram bot implementation |
| `servers/bot/discord_bot.py` | Discord bot with slash commands |

---

## Bengaluru Authorities

| Authority | Responsibility |
|-----------|---------------|
| BBMP | Roads, sanitation, public health, parks, building permissions |
| BWSSB | Water supply, sewage, underground drainage |
| BESCOM | Electricity supply, power distribution, street lighting |
| BMTC | Bus services, bus stops, metro feeder services |
| BDA | Land development, layout formation, building approvals |
| GBA | Large-scale urban governance, cross-agency coordination |
| BMRDA | Regional planning, peripheral area development |
| KSDB | Slum development, rehabilitation |

---

## Departments

- **roads** - Potholes, footpaths, street lights, traffic signals
- **sanitation** - Garbage, drains, sewage, public toilets
- **water** - Water supply, pipes, leaks, borewells
- **electricity** - Power outages, meters, transformers
- **transport** - Buses, metro, parking, traffic
- **housing** - Building violations, tenant issues
- **planning** - Zoning, land use, permits

---

## Environment Variables

### Required for Production

```env
# Security
SECRET_KEY=<secure-random-string>

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=true

# Laya Classifier
LAYA_CLASSIFIER_URL=http://localhost:8001
LAYA_CLASSIFIER_ENABLED=true

# Telegram Bot
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_ENABLED=true

# Discord Bot
DISCORD_BOT_TOKEN=<from Discord Developer Portal>
DISCORD_PUBLIC_KEY=<from Discord Developer Portal>
```

---

## Metrics Available

- HTTP request latency and throughput
- Classification accuracy and confidence
- Cache hit/miss rates
- Database query performance
- Kafka consumer lag
- Circuit breaker states

Access via `/metrics` endpoint (Prometheus format) or `/health` for summary.

---

## Circuit Breakers

Protects external service calls:

- `laya-classifier` - Laya SDK/HTTP calls
- Circuit opens after 5 consecutive failures
- Auto-recovery attempt after 30 seconds
- Half-open state allows limited test calls

---

## PII Protection

Detects and encrypts:
- Aadhaar numbers (12 digits)
- PAN cards (10 alphanumeric)
- Indian phone numbers (+91, 0 prefix)
- Email addresses
- PIN codes (6 digits)
- Vehicle registration (KA-XX-XX-XXXX)

Uses AES-256-GCM encryption with key derived from `SECRET_KEY`.

---

## Rate Limiting

- Anonymous users: 60 requests/minute
- Authenticated users: 120 requests/minute
- Redis sliding window algorithm
- 429 response with `Retry-After` header

---

## Development Commands

```bash
# Start all services
docker-compose up -d

# Run backend
cd servers && uvicorn api.main:app --reload

# Run frontend
cd client && pnpm dev

# Run tests
cd servers && pytest

# View metrics
curl http://localhost:8000/metrics

# Health check
curl http://localhost:8000/health
```

---

## Related Memories

- [[classifier-integration]] - Laya classifier setup details
- [[security-hardening]] - Security implementation details
- [[bot-framework]] - Chatbot architecture

---

*Last updated: Session continuing from Phase 5 implementation*
