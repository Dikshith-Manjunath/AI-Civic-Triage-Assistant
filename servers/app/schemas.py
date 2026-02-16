"""Pydantic schemas for CivicFlow API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────
class MediaType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"
    IMAGE = "image"
    PDF = "pdf"


class UrgencyLevel(int, Enum):
    LOW = 0
    MEDIUM = 1
    HIGH = 2


class TicketStatus(str, Enum):
    RECEIVED = "received"
    PROCESSING = "processing"
    TRIAGED = "triaged"
    ASSIGNED = "assigned"
    RESOLVED = "resolved"


class Department(str, Enum):
    WATER = "water"
    ROADS = "roads"
    SANITATION = "sanitation"
    ELECTRICITY = "electricity"
    PARKS = "parks"
    BUILDING = "building"
    TRAFFIC = "traffic"
    PUBLIC_HEALTH = "public_health"
    GENERAL = "general"


# ── Request / Response ────────────────────────────────────────────
class ComplaintSubmission(BaseModel):
    """Response after complaint ingestion."""
    ticket_id: UUID
    status: TicketStatus = TicketStatus.PROCESSING
    message: str = "Complaint received and queued for AI triage."


class TicketOut(BaseModel):
    """Full triaged ticket returned to dashboard."""
    id: UUID
    timestamp: datetime
    department: Department
    urgency: UrgencyLevel
    summary: str
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    status: TicketStatus
    channel: str
    citizen_reply: Optional[str] = None


class TicketListOut(BaseModel):
    tickets: list[TicketOut]
    total: int
    page: int
    page_size: int


class DashboardKPIs(BaseModel):
    total_complaints: int
    open_complaints: int
    avg_resolution_hours: float
    urgency_distribution: dict[str, int]
    department_distribution: dict[str, int]
    daily_trend: list[dict]


class GeoPoint(BaseModel):
    lat: float
    lon: float
    complaint_id: UUID
    urgency: UrgencyLevel
    department: Department
    summary: str


class HeatmapData(BaseModel):
    points: list[GeoPoint]


# ── Agent Internal Schemas ────────────────────────────────────────
class ComplaintState(BaseModel):
    """LangGraph agent state for complaint processing."""
    complaint_id: UUID
    raw_text: Optional[str] = None
    media_paths: list[str] = Field(default_factory=list)
    media_types: list[MediaType] = Field(default_factory=list)

    # Preprocessed
    transcription: Optional[str] = None
    image_caption: Optional[str] = None
    pdf_text: Optional[str] = None
    unified_text: str = ""

    # NER
    entities: dict = Field(default_factory=dict)
    location_str: Optional[str] = None

    # RAG
    similar_tickets: list[dict] = Field(default_factory=list)
    sop_context: str = ""

    # LLM Output
    department: Optional[Department] = None
    urgency: Optional[UrgencyLevel] = None
    summary: Optional[str] = None
    citizen_reply: Optional[str] = None

    # Geolocation
    lat: Optional[float] = None
    lon: Optional[float] = None

    # Validation
    is_valid: bool = False
    validation_errors: list[str] = Field(default_factory=list)
    retry_count: int = 0


class TriagedTicket(BaseModel):
    """Final validated ticket from LLM agent."""
    department: Department
    urgency: UrgencyLevel
    summary: str
    citizen_reply: str
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
