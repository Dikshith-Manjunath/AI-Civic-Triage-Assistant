# AI Civic Triage Assistant (CivicFlow)

An AI-powered civic issue triage system specifically designed for Bengaluru, India. It processes citizen complaints through multiple channels and automatically classifies them to appropriate departments, assigns urgency levels, and routes them to the correct authorities.

## Features

- **Multi-channel Input**: Accept complaints via API, Discord, and Telegram
- **AI Classification**: Automatic classification using local ML models (Laya) or cloud LLMs
- **Smart Routing**: Routes complaints to the correct department and authority
- **Urgency Detection**: Automatically prioritizes issues based on severity
- **Multi-modal Processing**: Handle text, audio, PDF, and image inputs
- **Real-time Analytics**: Dashboard with department-specific statistics
- **RAG Integration**: Standard Operating Procedure retrieval for context-aware responses

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Input Channels                            │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │   API    │    │ Discord  │    │ Telegram │                 │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                 │
└───────┼───────────────┼───────────────┼─────────────────────────┘
        │               │               │
        ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Preprocessing Layer                         │
│   • Audio transcription (faster-whisper)                         │
│   • PDF text extraction (pypdf)                                  │
│   • Image captioning (placeholder)                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Classification Layer (Laya)                    │
│   • Department classification                                    │
│   • Authority identification                                     │
│   • Urgency scoring                                              │
│   • PII detection                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Event Streaming (Kafka)                       │
│   • Real-time ticket processing                                  │
│   • Background worker tasks                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                   │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│   │ ClickHouse   │    │    Redis     │    │    MinIO     │      │
│   │   (Analytics)│    │   (Caching)  │    │   (Storage)  │      │
│   └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Material Symbols Icons** - Iconography

### Backend
- **FastAPI** - Python web framework
- **Python 3.11+** - Runtime
- **ClickHouse** - Analytics database
- **Redis** - Caching layer
- **Kafka** - Event streaming
- **MinIO** - S3-compatible object storage

### ML/AI
- **Laya Classifier** - Local ML model for classification
- **Sentence Transformers** - Text embeddings
- **Google GenAI** - Cloud LLM fallback
- **Faster Whisper** - Audio transcription

### Infrastructure
- **Docker Compose** - Container orchestration
- **ZooKeeper** - Kafka coordination

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 18+ (for frontend development)
- pnpm

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/AI-Civic-Triage-Assistant.git
cd AI-Civic-Triage-Assistant
```

### 2. Environment Setup

Create a `.env` file in the `servers/` directory:

```env
# Application
APP_ENV=development
LOG_LEVEL=INFO

# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=civicflow
CLICKHOUSE_PASSWORD=civicflow
CLICKHOUSE_DATABASE=civicflow

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO (S3-compatible storage)
MINIO_ENDPOINT=http://localhost:9100
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MEDIA_BUCKET_NAME=civicflow-media

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Laya Classifier
LAYA_CLASSIFIER_URL=http://localhost:8001

# AI/LLM
GOOGLE_API_KEY=your_google_api_key_here

# Discord (optional)
DISCORD_TOKEN=your_bot_token_here
DISCORD_PUBLIC_KEY=your_app_public_key_here

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 3. Start Services with Docker Compose

```bash
# Build and start all services
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **Laya Classifier**: http://localhost:8001
- **ClickHouse**: http://localhost:8123
- **Redis**: localhost:6379
- **Kafka**: localhost:9092

### 4. Local Development Setup

#### Backend

```bash
cd servers

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -e .

# Run API server
uvicorn api.main:app --reload --port 8000

# Run Kafka worker (in another terminal)
python -m workers.kafka_consumer
```

#### Frontend

```bash
cd client

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

## Project Structure

```
AI-Civic-Triage-Assistant/
├── client/                  # Next.js frontend
│   ├── app/                 # Pages and layouts
│   ├── components/          # React components
│   ├── lib/                 # Utilities and auth
│   └── public/              # Static assets
├── servers/                 # FastAPI backend
│   ├── api/                 # API routes and services
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Request middleware
│   │   └── db/              # Database schemas
│   ├── workers/             # Background tasks
│   ├── bot/                 # Telegram bot
│   ├── tests/               # Test suite
│   └── scripts/             # Utility scripts
├── laya/                    # Local ML classifier
│   ├── app.py               # FastAPI app
│   ├── requirements.txt     # Python deps
│   └── Dockerfile           # Container definition
├── BLR/                     # Bengaluru assets
├── authority_logos/         # Department logos
└── docker-compose.yml       # Service orchestration
```

## Key Components

### 1. Ticket Classification Agent

Located in `servers/api/services/ticket_agent.py`, handles:
- Department classification (roads, sanitation, water, electricity, etc.)
- Authority identification (BBMP, BWSSB, BESCOM, BMTC, etc.)
- Urgency scoring (Low=0, Medium=1, High=2)
- Citizen-facing acknowledgment generation

### 2. Laya Classifier

Local ML service for fast, offline classification:
- CPU-optimized PyTorch for lightweight deployment
- Sentence Transformers for text embeddings
- No external API dependencies

### 3. Multi-modal Preprocessing

Audio, PDF, and image processing pipeline:
- **Audio**: Faster Whisper transcription
- **PDF**: Text extraction with pypdf
- **Images**: Placeholder for future vision model

### 4. Event-Driven Architecture

Kafka-based event streaming:
- Real-time ticket processing
- Asynchronous classification
- Background worker tasks

## API Reference

### Submit Complaint

```bash
POST /api/v1/complaints
Content-Type: multipart/form-data

{
  "text": "Large pothole on MG Road causing accidents",
  "channel": "api",
  "location": "MG Road, Bengaluru",
  "media": [file]
}
```

### Get Ticket Status

```bash
GET /api/v1/tickets/{ticket_id}
```

### Department Statistics

```bash
GET /api/v1/analytics/stats
```

### Health Check

```bash
GET /health
```

## Authorities Covered

| Code   | Authority | Domain |
|--------|-----------|--------|
| BBMP   | Bruhat Bengaluru Mahanagara Palike | Roads, Sanitation |
| BWSSB  | Bangalore Water Supply & Sewerage Board | Water, Sewage |
| BESCOM | Bangalore Electricity Supply Company | Electricity |
| BMTC   | Bengaluru Metropolitan Transport Corporation | Public Transport |
| BDA    | Bangalore Development Authority | Urban Planning |
| BMRDA  | Bangalore Metropolitan Region Development Authority | Regional Planning |

## Testing

### Backend Tests

```bash
cd servers
pytest
pytest --cov=api tests/  # with coverage
```

### Frontend Tests

```bash
cd client
pnpm test
```

## Deployment

### Production Checklist

- [ ] Replace wildcard CORS with specific origins
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Review environment variables
- [ ] Enable rate limiting
- [ ] Set up CI/CD pipeline

### Docker Production Build

```bash
# Build all services
docker compose -f docker-compose.prod.yml build

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

## Monitoring

- **Prometheus metrics**: Available at `/metrics` endpoint
- **Structured logging**: JSON format with correlation IDs
- **Health checks**: Docker HEALTHCHECK for all services

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Bengaluru civic authorities for domain expertise
- OpenStreetMap for geospatial data
- The open-source community for amazing tools

## Support

For issues and feature requests, please use [GitHub Issues](https://github.com/yourusername/AI-Civic-Triage-Assistant/issues).

---

**Built with ❤️ for Bengaluru**
