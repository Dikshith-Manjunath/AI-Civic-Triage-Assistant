# CivicFlow - AI Civic Issue Triage Assistant

AI-powered system that converts multimodal citizen complaints (text/audio/images/PDFs) into structured, geo-tagged municipal tickets using local LLM with RAG.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Next.js 15    │────▶│   FastAPI API     │────▶│   ClickHouse     │
│   Dashboard     │     │   Gateway         │     │   Data Warehouse │
│   (Port 3000)   │     │   (Port 8000)     │     │   (Port 8123)    │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                              │       │
                              ▼       ▼
                        ┌──────┐ ┌──────────┐
                        │MinIO │ │ Redpanda  │
                        │(S3)  │ │ (Kafka)   │
                        └──────┘ └──────────┘
```

## Tech Stack

| Component    | Technology                              |
| ------------ | --------------------------------------- |
| Frontend     | Next.js 15, TailwindCSS 4, TypeScript   |
| Backend      | FastAPI, LangGraph, Pydantic v2         |
| LLM          | Local Llama 3.1 8B (via Ollama/OpenLLM) |
| NLP          | spaCy, Whisper, CLIP                    |
| Database     | ClickHouse (OLAP + vector search)       |
| Object Store | MinIO (S3-compatible)                   |
| Queue        | Redpanda (Kafka-compatible)             |
| Embeddings   | sentence-transformers/all-MiniLM-L6-v2  |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ with pnpm
- Python 3.11+
- (Optional) Ollama with llama3.1:8b-instruct

### 1. Start Infrastructure
```bash
docker compose up -d clickhouse minio redpanda
```

### 2. Start Backend
```bash
cd servers
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m spacy download en_core_web_sm
python main.py
```

### 3. Start Frontend
```bash
cd client
pnpm install
pnpm dev
```

### 4. Full Docker Stack
```bash
docker compose up --build
```

## API Endpoints

| Method | Path                         | Description                    |
| ------ | ---------------------------- | ------------------------------ |
| POST   | `/api/v1/complaints`         | Submit multimodal complaint    |
| GET    | `/api/v1/tickets`            | List triaged tickets           |
| GET    | `/api/v1/tickets/{id}`       | Get single ticket              |
| GET    | `/api/v1/dashboard/kpis`     | Dashboard KPI metrics          |
| GET    | `/api/v1/dashboard/heatmap`  | Geo-points for heatmap         |
| GET    | `/api/v1/dashboard/department-trend` | Department trends    |
| GET    | `/health`                    | Health check                   |

## Dashboard Pages

- **`/dashboard`** - KPIs, department/urgency charts, recent tickets
- **`/tickets`** - Filterable, paginated ticket table
- **`/map`** - Geographic complaint distribution
- **`/analytics`** - Trends, department load, urgency breakdown
- **`/submit`** - Multimodal complaint submission form

## LangGraph Agent Pipeline

```
preprocess → ner_extract → rag_retrieve → llm_ticket → validate
     ↑                                                     │
     └──────────────── (retry if invalid) ─────────────────┘
                              ↓
                    geocode → write_db → END
```

## Project Structure

```
├── docker-compose.yml
├── client/                    # Next.js 15 frontend
│   ├── app/
│   │   ├── dashboard/         # KPI dashboard
│   │   ├── tickets/           # Ticket table
│   │   ├── map/               # Geographic map
│   │   ├── analytics/         # Charts & trends
│   │   └── submit/            # Complaint form
│   ├── components/            # Shared UI components
│   └── lib/                   # API client & types
├── servers/                   # FastAPI backend
│   ├── app/
│   │   ├── agent/             # LangGraph triage pipeline
│   │   │   └── nodes/         # Pipeline nodes
│   │   ├── routes/            # API endpoints
│   │   └── services/          # ClickHouse, Kafka, MinIO
│   └── db/init/               # ClickHouse schema
```
