"""LLM triage node: generate structured ticket JSON from unified text."""

from __future__ import annotations

import json

import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

TRIAGE_PROMPT = """You are CivicFlow, an AI assistant for municipal complaint triage.
Analyze the citizen complaint below and produce a JSON response.

COMPLAINT:
{unified_text}

ENTITIES DETECTED:
{entities}

SIMILAR PAST COMPLAINTS:
{sop_context}

INSTRUCTIONS:
1. Classify into exactly ONE department: water, roads, sanitation, electricity, parks, building, traffic, public_health, general
2. Assign urgency: 0 (low - cosmetic/minor), 1 (medium - functional issue), 2 (high - safety hazard/emergency)
3. Write a concise professional summary (1-2 sentences)
4. Draft a polite citizen reply acknowledging the issue and expected action

RESPOND WITH ONLY THIS JSON (no markdown, no extra text):
{{
    "department": "<department>",
    "urgency": <0|1|2>,
    "summary": "<professional summary>",
    "citizen_reply": "<polite acknowledgment to citizen>"
}}
"""


async def generate_ticket(state: dict) -> dict:
    """Use local OpenLLM to generate structured triage ticket."""
    log = logger.bind(complaint_id=state["complaint_id"])
    log.info("Generating triage ticket via LLM")

    prompt = TRIAGE_PROMPT.format(
        unified_text=state.get("unified_text", "No content"),
        entities=json.dumps(state.get("entities", {}), indent=2),
        sop_context=state.get("sop_context", "No similar complaints found"),
    )

    try:
        result = await _call_llm(prompt)
        parsed = _parse_llm_response(result)

        return {
            **state,
            "department": parsed.get("department", "general"),
            "urgency": parsed.get("urgency", 1),
            "summary": parsed.get("summary", state.get("unified_text", "")[:200]),
            "citizen_reply": parsed.get("citizen_reply", "Your complaint has been received."),
            "retry_count": state.get("retry_count", 0) + 1,
        }
    except Exception as e:
        log.error("LLM triage failed", error=str(e))
        # Fallback to keyword-based classification
        entities = state.get("entities", {})
        return {
            **state,
            "department": entities.get("dept_hint", "general"),
            "urgency": 1,
            "summary": (state.get("unified_text", "") or "")[:200],
            "citizen_reply": "Your complaint has been received and will be reviewed by our team.",
            "retry_count": state.get("retry_count", 0) + 1,
        }


async def _call_llm(prompt: str) -> str:
    """Call the local OpenLLM instance or Groq fallback."""
    from openai import AsyncOpenAI

    # Try local OpenLLM first
    try:
        client = AsyncOpenAI(
            base_url=settings.openllm_base_url,
            api_key="not-needed",  # Local model
        )
        response = await client.chat.completions.create(
            model=settings.openllm_model,
            messages=[
                {"role": "system", "content": "You are a municipal complaint triage AI. Respond only with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=500,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.warning("Local LLM failed, trying Groq fallback", error=str(e))

    # Groq fallback
    if settings.groq_api_key:
        try:
            client = AsyncOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.groq_api_key,
            )
            response = await client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": "You are a municipal complaint triage AI. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=500,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error("Groq fallback also failed", error=str(e))
            raise

    raise RuntimeError("No LLM available (local or fallback)")


def _parse_llm_response(text: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    text = text.strip()

    # Remove markdown code blocks if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    # Find JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM JSON response", response=text[:200])
        return {}
