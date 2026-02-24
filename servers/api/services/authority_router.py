"""Authority Router — hybrid deterministic + LLM routing engine for civic authorities."""

from __future__ import annotations

import logging
import re
from collections import Counter

from api.models.ticket import VALID_AUTHORITIES
from api.services.nim_client import chat_completion

logger = logging.getLogger("civicflow.authority_router")

# ── Default fallback when all else fails ──
DEFAULT_AUTHORITY = "BBMP"

# ── Deterministic keyword → authority rules ──
# Each entry: (compiled regex pattern, authority code)
# Evaluated top-to-bottom; first match wins.
_RULES: list[tuple[re.Pattern[str], str]] = [
    # BWSSB — water, sewage, drainage
    (re.compile(
        r"\b(water\s*supply|no\s*water|water\s*leak|water\s*shortage|sewage|sewer"
        r"|drainage|drain|borewell|bore\s*well|cauvery|kaveri|water\s*board"
        r"|water\s*pipe|pipe\s*burst|tap\s*water|dirty\s*water|flood(?:ing)?)\b",
        re.IGNORECASE,
    ), "BWSSB"),

    # BESCOM — electricity, power
    (re.compile(
        r"\b(electric(?:ity|al)?|power\s*(?:cut|outage|failure|supply)|transformer"
        r"|voltage|meter|street\s*light|pole|cable|wire|bescom|load\s*shedding"
        r"|power\s*line|short\s*circuit|electr(?:ocution|ic\s*shock))\b",
        re.IGNORECASE,
    ), "BESCOM"),

    # BMTC — public transport / buses
    (re.compile(
        r"\b(bmtc|bus(?:es)?|bus\s*(?:stop|route|shelter|stand|service|frequency)"
        r"|public\s*transport|volvo|metro\s*feeder)\b",
        re.IGNORECASE,
    ), "BMTC"),

    # BWSSB (secondary — dept-based)
    # (covered above already, dept check handled later)

    # BDA — development authority, layouts, planning
    (re.compile(
        r"\b(bda|layout\s*(?:approval|plan|sanction|encroach)|site\s*allot"
        r"|land\s*use|zoning|building\s*plan"
        r"|plan\s*approval|development\s*authority|encroachment\s*(?:on|of)\s*bda"
        r"|unauthor[iz](?:ed|sed)\s*(?:construction|layout|building))\b",
        re.IGNORECASE,
    ), "BDA"),

    # BMRDA — regional planning
    (re.compile(
        r"\b(bmrda|regional\s*planning|metropolitan\s*region|peri\s*urban"
        r"|regional\s*development)\b",
        re.IGNORECASE,
    ), "BMRDA"),

    # BEML — metro equipment, heavy engineering
    (re.compile(
        r"\b(beml|metro\s*(?:rail|train|coach|equipment)|namma\s*metro"
        r"|heavy\s*engineer)\b",
        re.IGNORECASE,
    ), "BEML"),

    # KSDB — slum development, rehabilitation
    (re.compile(
        r"\b(ksdb|slum|rehabilitation|slum\s*(?:develop|board|dwell|area)"
        r"|hutment|kachcha\s*house)\b",
        re.IGNORECASE,
    ), "KSDB"),

    # GBA — large-scale urban governance
    (re.compile(
        r"\b(gba|greater\s*bengaluru|urban\s*governance|city\s*planning"
        r"|master\s*plan)\b",
        re.IGNORECASE,
    ), "GBA"),
]

# ── Department → authority mapping (weaker signal, used as tiebreaker) ──
_DEPT_AUTHORITY_MAP: dict[str, str] = {
    "water": "BWSSB",
    "electricity": "BESCOM",
    "transport": "BMTC",
    "planning": "BDA",
    "housing": "KSDB",
    "roads": "BBMP",
    "sanitation": "BBMP",
}

# ── LLM prompt for authority routing (strict constraint) ──
_AUTHORITY_PROMPT = """\
You are an authority routing engine for Bengaluru civic complaints.

Given a complaint and its department classification, select the SINGLE most appropriate authority.

VALID AUTHORITIES (select EXACTLY ONE):
  BBMP   — Bruhat Bengaluru Mahanagara Palike (roads, sanitation, general civic)
  GBA    — Greater Bengaluru Authority (large-scale urban governance)
  BWSSB  — Bangalore Water Supply & Sewerage Board (water, sewage, drainage)
  BESCOM — Bangalore Electricity Supply Company (electricity, power)
  BMTC   — Bengaluru Metropolitan Transport Corporation (public buses, transport)
  BEML   — BEML Limited (heavy engineering, metro equipment)
  BDA    — Bangalore Development Authority (land, layouts, planning)
  BMRDA  — Bangalore Metropolitan Region Development Authority (regional planning)
  KSDB   — Karnataka Slum Development Board (slum housing, rehabilitation)

RULES:
- Output ONLY the authority code (e.g. "BWSSB"). No explanation, no quotes, no extra text.
- You MUST choose from the list above. Do NOT invent new codes.
"""


def _rule_match(text: str) -> str | None:
    """Apply deterministic keyword rules to the complaint text.

    Returns the matched authority code, or None if no rule matches.
    """
    for pattern, authority in _RULES:
        if pattern.search(text):
            logger.info("Rule match: pattern matched → %s", authority)
            return authority
    return None


def _dept_default(dept: str) -> str:
    """Return a default authority based on department classification."""
    return _DEPT_AUTHORITY_MAP.get(dept, DEFAULT_AUTHORITY)


def _similarity_consensus(similar_complaints: list[dict] | None) -> str | None:
    """Check if similar complaints show strong consensus on authority.

    Returns the authority if >=60% of similar complaints agree, else None.
    """
    if not similar_complaints or len(similar_complaints) < 2:
        return None

    authorities = [c["authority"] for c in similar_complaints if c.get("authority")]
    if not authorities:
        return None

    counter = Counter(authorities)
    most_common, count = counter.most_common(1)[0]
    ratio = count / len(authorities)

    if ratio >= 0.6:
        logger.info(
            "Similarity consensus: %s (%.0f%% of %d similar complaints)",
            most_common, ratio * 100, len(authorities),
        )
        return most_common

    logger.debug(
        "No similarity consensus (top=%s at %.0f%%)",
        most_common, ratio * 100,
    )
    return None


async def _llm_route(dept: str, complaint_text: str) -> str:
    """Use the LLM as a fallback to determine authority.

    Returns a validated authority code.
    """
    user_message = f"Department: {dept}\nComplaint: {complaint_text}"

    try:
        raw = await chat_completion(
            system_prompt=_AUTHORITY_PROMPT,
            user_message=user_message,
        )
        authority = raw.strip().upper().replace('"', "").replace("'", "")
        logger.info("LLM authority routing → %s", authority)
        return authority
    except Exception as exc:
        logger.error("LLM authority routing failed: %s", exc)
        return DEFAULT_AUTHORITY


def _validate_authority(authority: str, source: str) -> str:
    """Validate that the authority is in the allowed set.

    Falls back to BBMP and logs a warning if invalid.
    """
    authority = authority.upper().strip()
    if authority in VALID_AUTHORITIES:
        return authority

    logger.warning(
        "Invalid authority '%s' from %s — falling back to %s",
        authority, source, DEFAULT_AUTHORITY,
    )
    return DEFAULT_AUTHORITY


async def route_authority(
    dept: str,
    complaint_text: str,
    similar_complaints: list[dict] | None = None,
) -> str:
    """Determine the correct authority using a hybrid routing strategy.

    Routing priority:
      1. Deterministic keyword rules (highest confidence)
      2. Similarity consensus from past complaints (if strong agreement)
      3. Department-based default mapping
      4. LLM fallback (only when ambiguous)

    Args:
        dept: Department classification from the LLM.
        complaint_text: Raw/unified complaint text.
        similar_complaints: Optional similar past complaints from retrieval.

    Returns:
        A validated authority code from VALID_AUTHORITIES.
    """
    logger.info("Routing authority for dept=%s, text=%d chars", dept, len(complaint_text))

    # ── Layer 1: Deterministic keyword rules ──
    rule_result = _rule_match(complaint_text)
    if rule_result:
        authority = _validate_authority(rule_result, "rule_match")
        logger.info("Authority routed via RULES → %s", authority)
        return authority

    # ── Layer 2: Similarity consensus ──
    consensus = _similarity_consensus(similar_complaints)
    if consensus:
        authority = _validate_authority(consensus, "similarity_consensus")
        logger.info("Authority routed via SIMILARITY CONSENSUS → %s", authority)
        return authority

    # ── Layer 3: Department-based default (for clear-cut mappings) ──
    dept_authority = _dept_default(dept)
    # Use dept default for strongly-mapped departments
    if dept in ("water", "electricity", "transport"):
        authority = _validate_authority(dept_authority, "dept_default")
        logger.info("Authority routed via DEPT DEFAULT → %s", authority)
        return authority

    # ── Layer 4: LLM fallback for ambiguous cases ──
    logger.info("No deterministic match — falling back to LLM for authority routing")
    llm_result = await _llm_route(dept, complaint_text)
    authority = _validate_authority(llm_result, "llm_fallback")
    logger.info("Authority routed via LLM FALLBACK → %s", authority)
    return authority
