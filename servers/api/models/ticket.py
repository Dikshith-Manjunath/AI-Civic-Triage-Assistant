"""Pydantic models for the CivicFlow ticket schema."""

from __future__ import annotations

from enum import IntEnum
from typing import Literal

from pydantic import BaseModel, Field

# ── Valid authority codes ──
AUTHORITY_CODES = Literal[
    "BBMP",  # Bruhat Bengaluru Mahanagara Palike
    "GBA",  # Greater Bengaluru Authority
    "BWSSB",  # Bangalore Water Supply & Sewerage Board
    "BESCOM",  # Bangalore Electricity Supply Company
    "BMTC",  # Bengaluru Metropolitan Transport Corporation
    "BEML",  # BEML Limited
    "BDA",  # Bangalore Development Authority
    "BMRDA",  # Bangalore Metropolitan Region Development Authority
    "KSDB",  # Karnataka Slum Development Board
]

VALID_AUTHORITIES: set[str] = {
    "BBMP",
    "GBA",
    "BWSSB",
    "BESCOM",
    "BMTC",
    "BEML",
    "BDA",
    "BMRDA",
    "KSDB",
}

VALID_DEPARTMENTS: set[str] = {
    "roads",
    "sanitation",
    "water",
    "electricity",
    "transport",
    "housing",
    "planning",
}


class Urgency(IntEnum):
    LOW = 0
    MEDIUM = 1
    HIGH = 2


class TicketClassification(BaseModel):
    """The structured output the LLM must produce."""

    dept: str = Field(..., description="Civic category (e.g. roads, sanitation, water)")
    authority: str = Field(..., description="Authority code (e.g. BBMP, BWSSB)")
    urgency: int = Field(..., ge=0, le=2, description="0=Low, 1=Medium, 2=High")
    summary: str = Field(..., min_length=5, description="Concise structured description")
    reply: str = Field(..., min_length=5, description="Citizen-facing acknowledgement")


class TicketResponse(BaseModel):
    """Full ticket returned to the caller after DB insert."""

    id: str
    timestamp: str
    dept: str
    authority: str
    urgency: int
    summary: str
    reply: str
    status: str = "pending"


class ComplaintRequest(BaseModel):
    """Body schema for the POST /complaints endpoint (JSON mode)."""

    text: str = Field(..., min_length=10, description="Citizen complaint text")


class AsyncTicketResponse(BaseModel):
    """Response for asynchronously accepted complaints."""

    id: str
    status: Literal["accepted"] = "accepted"
    message: str = "Complaint received and is being processed by AI."
