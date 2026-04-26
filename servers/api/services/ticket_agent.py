"""Ticket Agent — orchestrates LLM classification of citizen complaints."""

from __future__ import annotations

import json
import logging
import re

from api.models.ticket import VALID_AUTHORITIES, VALID_DEPARTMENTS, TicketClassification
from api.services.nim_client import chat_completion
from api.services.sop_retrieval import retrieve_relevant_sops

logger = logging.getLogger("civicflow.agent")

SYSTEM_PROMPT = """\
You are CivicFlow, an AI civic-issue triage assistant for Bengaluru, India.

Given a citizen complaint, you MUST return a JSON object with EXACTLY these fields:
{
  "dept": "<department>",
  "authority": "<authority_code>",
  "urgency": <0|1|2>,
  "summary": "<concise structured description>",
  "reply": "<citizen-facing acknowledgement>"
}

DEPARTMENTS (choose one):
  roads, sanitation, water, electricity, transport, housing, planning

AUTHORITY CODES (choose one):
  BBMP   — Bruhat Bengaluru Mahanagara Palike (roads, sanitation, general civic)
  GBA    — Greater Bengaluru Authority (large-scale urban governance)
  BWSSB  — Bangalore Water Supply & Sewerage Board (water, sewage)
  BESCOM — Bangalore Electricity Supply Company (electricity, power)
  BMTC   — Bengaluru Metropolitan Transport Corporation (public buses, transport)
  BEML   — BEML Limited (heavy engineering, metro equipment)
  BDA    — Bangalore Development Authority (land, layouts, planning)
  BMRDA  — Bangalore Metropolitan Region Development Authority (regional planning)
  KSDB   — Karnataka Slum Development Board (slum housing, rehabilitation)

URGENCY:
  0 = Low   (minor inconvenience, non-urgent)
  1 = Medium (notable disruption, should be addressed soon)
  2 = High  (safety risk, major outage, health hazard)

RULES:
- Output ONLY valid JSON. No markdown, no explanation, no extra text.
- Choose the MOST appropriate department and authority for the complaint.
- The "summary" should be 1-2 sentences capturing the core issue.
- The "reply" should be a polite acknowledgement telling the citizen their complaint is received.
- If municipal guidelines/SOPs are provided, use them to ground your response.
  Reference relevant policies when applicable but do NOT hallucinate policy details.
"""


def _extract_json(text: str) -> dict:
    """Extract the first JSON object from LLM output, handling markdown fences."""
    # Strip markdown code fences if present
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1).strip()

    # Find first { ... } block
    start = text.find("{")
    if start == -1:
        raise ValueError(f"No JSON object found in LLM output: {text[:200]}")

    end = text.rfind("}")
    if end == -1 or end <= start:
        # LLM may have returned truncated JSON — try to repair by adding closing brace
        logger.warning("JSON appears truncated, attempting repair")
        text = text[start:] + "}"
        # Try adding missing quotes if needed
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try more aggressive repair — add closing quote + brace
            text = text.rstrip() + '"}'
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                raise ValueError(f"Truncated/invalid JSON from LLM: {text[:200]}")

    return json.loads(text[start : end + 1])


def _build_context_block(similar_complaints: list[dict] | None) -> str:
    """Build a context block from similar past complaints for the LLM."""
    if not similar_complaints:
        return ""

    lines = ["\n--- Related past complaints (for context) ---"]
    for i, c in enumerate(similar_complaints, 1):
        lines.append(
            f"{i}. [{c['dept'].upper()}/{c['authority']}] (urgency={c['urgency']}) {c['summary']}"
        )
    lines.append("--- End of related complaints ---\n")
    return "\n".join(lines)


def _build_sop_context(sop_chunks: list[dict]) -> str:
    """Build a context block from retrieved SOP document chunks."""
    if not sop_chunks:
        return ""

    lines = ["\n--- Relevant Municipal Guidelines / SOPs ---"]
    for i, chunk in enumerate(sop_chunks, 1):
        lines.append(f"{i}. [{chunk['source']}] (relevance={chunk['score']:.2f})")
        lines.append(f"   {chunk['chunk_text'][:800]}")
    lines.append("--- End of guidelines ---\n")
    return "\n".join(lines)


async def classify_complaint(
    complaint_text: str,
    similar_complaints: list[dict] | None = None,
    complaint_embedding: list[float] | None = None,
) -> TicketClassification:
    """Send the complaint to the LLM and return a validated TicketClassification.

    Args:
        complaint_text: Unified text from citizen input.
        similar_complaints: Optional list of similar past complaints for context.
        complaint_embedding: Optional pre-computed embedding for SOP retrieval.
    """
    logger.info("Classifying complaint (%d chars)", len(complaint_text))

    # ── Retrieve SOP context (Phase 6 RAG) ──
    sop_chunks: list[dict] = []
    if complaint_embedding:
        try:
            sop_chunks = retrieve_relevant_sops(complaint_embedding, limit=5)
            if sop_chunks:
                logger.info("Retrieved %d SOP chunks for RAG context", len(sop_chunks))
        except Exception as exc:
            logger.warning("SOP retrieval failed (non-fatal): %s", exc)

    # Enrich user message with historical context if available
    context_block = _build_context_block(similar_complaints)
    sop_block = _build_sop_context(sop_chunks)
    enriched_message = f"{sop_block}{context_block}{complaint_text}"

    if context_block:
        logger.info(
            "Enriched LLM prompt with %d similar complaints",
            len(similar_complaints or []),
        )

    raw_response = await chat_completion(
        system_prompt=SYSTEM_PROMPT,
        user_message=enriched_message,
    )

    # Parse and validate
    try:
        parsed = _extract_json(raw_response)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse LLM JSON: %s — raw: %s", exc, raw_response[:300])
        raise ValueError(f"LLM returned invalid JSON: {exc}") from exc

    # Normalise fields
    parsed["dept"] = parsed.get("dept", "").lower().strip()
    parsed["authority"] = parsed.get("authority", "").upper().strip()

    # Validate authority
    if parsed["authority"] not in VALID_AUTHORITIES:
        logger.warning("Unknown authority '%s', defaulting to BBMP", parsed["authority"])
        parsed["authority"] = "BBMP"

    # Validate department
    if parsed["dept"] not in VALID_DEPARTMENTS:
        logger.warning("Unknown dept '%s', keeping as-is", parsed["dept"])

    # Clamp urgency
    parsed["urgency"] = max(0, min(2, int(parsed.get("urgency", 1))))

    ticket = TicketClassification(**parsed)
    logger.info(
        "Classification result: dept=%s authority=%s urgency=%d",
        ticket.dept,
        ticket.authority,
        ticket.urgency,
    )
    return ticket
