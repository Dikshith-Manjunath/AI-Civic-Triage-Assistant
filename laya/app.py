"""Laya Classifier - Local ML Model for Civic Complaint Classification.

This is a placeholder FastAPI app. Replace with actual model implementation.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("laya")

app = FastAPI(
    title="Laya Classifier",
    description="Local ML model for civic complaint classification",
    version="1.0.0",
)


class ClassificationRequest(BaseModel):
    text: str
    channel: str = "api"
    location: Optional[str] = None


class ClassificationResponse(BaseModel):
    department: str
    authority: str
    urgency: int
    confidence: float
    safety_hazard: bool = False
    requires_inspection: bool = True
    model: str = "laya-v1"
    mode: str = "local"


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "laya-classifier"}


@app.post("/classify", response_model=dict)
async def classify(request: ClassificationRequest):
    """Classify a complaint.

    This is a placeholder implementation using rule-based classification.
    Replace with actual ML model inference.
    """
    text_lower = request.text.lower()

    # Simple rule-based classification (replace with ML model)
    department = "roads"
    authority = "BBMP"
    urgency = 1

    # Department detection
    if any(kw in text_lower for kw in ["pothole", "road", "footpath", "street"]):
        department = "roads"
        authority = "BBMP"
    elif any(kw in text_lower for kw in ["water", "pipe", "leak", "supply"]):
        department = "water"
        authority = "BWSSB"
    elif any(kw in text_lower for kw in ["electricity", "power", "outage", "wire"]):
        department = "electricity"
        authority = "BESCOM"
    elif any(kw in text_lower for kw in ["garbage", "trash", "waste", "drain"]):
        department = "sanitation"
        authority = "BBMP"
    elif any(kw in text_lower for kw in ["bus", "transport", "metro"]):
        department = "transport"
        authority = "BMTC"

    # Urgency detection
    if any(kw in text_lower for kw in ["emergency", "dangerous", "accident", "urgent"]):
        urgency = 2
    elif any(kw in text_lower for kw in ["large", "big", "major", "serious"]):
        urgency = 2
    elif any(kw in text_lower for kw in ["small", "minor"]):
        urgency = 0

    # Safety hazard detection
    safety_hazard = any(kw in text_lower for kw in ["accident", "dangerous", "injury", "emergency"])

    return {
        "classification": {
            "department": department,
            "authority": authority,
            "urgency": urgency,
            "confidence": 0.85,
            "safety_hazard": safety_hazard,
            "requires_inspection": True,
            "model": "laya-placeholder",
            "mode": "rule-based",
        },
        "pii": {"detected": False},
    }
