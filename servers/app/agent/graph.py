"""
CivicFlow LangGraph Agent - Multimodal Complaint Triage Pipeline.

Graph: preprocess → ner_extract → rag_retrieve → llm_ticket → validate
       ↑                                                        │
       └────────────── (retry if invalid) ──────────────────────┘
"""

from __future__ import annotations

from typing import Annotated, TypedDict

import structlog
from langgraph.graph import END, StateGraph

from app.agent.nodes.geocode import geocode_location
from app.agent.nodes.llm_triage import generate_ticket
from app.agent.nodes.ner import extract_entities
from app.agent.nodes.preprocess import preprocess_multimodal
from app.agent.nodes.rag import retrieve_similar
from app.agent.nodes.validate import validate_ticket
from app.agent.nodes.writer import write_to_clickhouse

logger = structlog.get_logger()


# ── Agent State ──────────────────────────────────────────────────
class AgentState(TypedDict):
    # Input
    complaint_id: str
    raw_text: str | None
    media_paths: list[str]
    media_types: list[str]
    location: str | None
    channel: str

    # Preprocessed
    transcription: str
    image_caption: str
    pdf_text: str
    unified_text: str

    # NER
    entities: dict
    location_str: str

    # RAG
    similar_tickets: list[dict]
    sop_context: str

    # LLM Output
    department: str
    urgency: int
    summary: str
    citizen_reply: str

    # Geo
    lat: float
    lon: float

    # Validation
    is_valid: bool
    validation_errors: list[str]
    retry_count: int

    # Embedding
    embedding: list[float]


# ── Routing ──────────────────────────────────────────────────────
def should_retry(state: AgentState) -> str:
    """Route back to LLM if validation failed and retries remain."""
    if state.get("is_valid", False):
        return "geocode"
    if state.get("retry_count", 0) >= 3:
        logger.warning("Max retries reached, writing with errors", id=state["complaint_id"])
        return "geocode"
    return "llm_ticket"


# ── Build Graph ──────────────────────────────────────────────────
def build_triage_graph() -> StateGraph:
    """Construct the LangGraph complaint triage pipeline."""
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("preprocess", preprocess_multimodal)
    graph.add_node("ner_extract", extract_entities)
    graph.add_node("rag_retrieve", retrieve_similar)
    graph.add_node("llm_ticket", generate_ticket)
    graph.add_node("validate", validate_ticket)
    graph.add_node("geocode", geocode_location)
    graph.add_node("write_db", write_to_clickhouse)

    # Linear edges
    graph.add_edge("preprocess", "ner_extract")
    graph.add_edge("ner_extract", "rag_retrieve")
    graph.add_edge("rag_retrieve", "llm_ticket")
    graph.add_edge("llm_ticket", "validate")

    # Conditional: validate → retry or continue
    graph.add_conditional_edges("validate", should_retry, {
        "llm_ticket": "llm_ticket",
        "geocode": "geocode",
    })

    graph.add_edge("geocode", "write_db")
    graph.add_edge("write_db", END)

    # Entry point
    graph.set_entry_point("preprocess")

    return graph


# Compiled graph singleton
triage_graph = build_triage_graph().compile()
