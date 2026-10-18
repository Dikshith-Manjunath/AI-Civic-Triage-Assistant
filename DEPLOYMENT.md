# CivicFlow Deployment Guide

## Quick Start

### 1. Setup Environment Variables

```bash
cd servers
cp .env.example .env
```

Edit `.env` and set your credentials:
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `GROQ_API_KEY` - From https://console.groq.com/
- `SECRET_KEY` - Generate with `openssl rand -hex 32`

### 2. Start All Services

```bash
# Start everything
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Verify Services

```bash
# API health check
curl http://localhost:8000/health

# Laya classifier health check
curl http://localhost:8001/health

# Bot logs
docker-compose logs -f civicflow-bot
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:8000 | FastAPI backend |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Laya Classifier | http://localhost:8001 | ML classification |
| MinIO Console | http://localhost:9101 | Media storage UI |
| Redis | localhost:6379 | Cache |
| ClickHouse | localhost:8123 | Analytics DB |
| Kafka | localhost:9092 | Event streaming |

## Running the Bot Locally (Without Docker)

```bash
cd servers

# Install dependencies
pip install -e .

# Run the bot
python -m bot.main
```

## Docker Commands

```bash
# Build all services
docker-compose build

# Start specific service
docker-compose up -d civicflow-api

# Stop all services
docker-compose down

# Remove volumes (reset data)
docker-compose down -v

# View logs for specific service
docker-compose logs -f civicflow-bot

# Restart a service
docker-compose restart civicflow-bot
```

## Troubleshooting

### Bot not starting?
1. Check `.env` has `TELEGRAM_BOT_TOKEN` and `GROQ_API_KEY`
2. Check logs: `docker-compose logs civicflow-bot`

### API not connecting to database?
1. Wait for services to be healthy: `docker-compose ps`
2. Check ClickHouse is running: `docker-compose logs clickhouse`

### Classification failing?
1. Check Laya classifier is running: `curl http://localhost:8001/health`
2. The bot will use fallback classification if Laya is unavailable

### Want to reset everything?
```bash
docker-compose down -v
docker-compose up -d
```

## Production Deployment

For production, update these in `.env`:

```bash
APP_ENV=production
LOG_LEVEL=WARNING
SECRET_KEY=<secure-random-string>
CLICKHOUSE_PASSWORD=<secure-password>
MINIO_ROOT_PASSWORD=<secure-password>
```

And set up:
- SSL/TLS certificates
- Proper secrets management
- Monitoring and alerting
- Regular backups
