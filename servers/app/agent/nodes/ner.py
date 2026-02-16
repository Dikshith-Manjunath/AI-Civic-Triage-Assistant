"""NER extraction node: extract entities from unified text using spaCy."""

from __future__ import annotations

import structlog

logger = structlog.get_logger()

# Lazy-load spaCy model
_nlp = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model loaded")
        except Exception as e:
            logger.warning("spaCy unavailable", error=str(e))
            _nlp = "unavailable"
    return _nlp if _nlp != "unavailable" else None


# Department keyword mapping for fallback classification
DEPT_KEYWORDS = {
    "water": ["water", "pipe", "leak", "drainage", "sewage", "flood", "tap", "supply", "plumbing"],
    "roads": ["road", "pothole", "pavement", "street", "highway", "asphalt", "crack", "bridge"],
    "sanitation": ["garbage", "waste", "trash", "dump", "cleaning", "sweeping", "bin", "litter"],
    "electricity": ["power", "electric", "light", "pole", "wire", "outage", "transformer", "voltage"],
    "parks": ["park", "garden", "tree", "bench", "playground", "green", "lawn"],
    "building": ["building", "construction", "permit", "structure", "unsafe", "collapse"],
    "traffic": ["traffic", "signal", "sign", "parking", "congestion", "accident"],
    "public_health": ["health", "disease", "mosquito", "pest", "hygiene", "contamination"],
}


async def extract_entities(state: dict) -> dict:
    """Extract named entities and classify department from unified text."""
    log = logger.bind(complaint_id=state["complaint_id"])
    text = state.get("unified_text", "")

    entities = {
        "locations": [],
        "organizations": [],
        "persons": [],
        "dates": [],
        "keywords": [],
    }
    location_str = state.get("location", "") or ""

    # spaCy NER
    nlp = _get_nlp()
    if nlp and text:
        doc = nlp(text)
        for ent in doc.ents:
            if ent.label_ in ("GPE", "LOC", "FAC"):
                entities["locations"].append(ent.text)
                if not location_str:
                    location_str = ent.text
            elif ent.label_ == "ORG":
                entities["organizations"].append(ent.text)
            elif ent.label_ == "PERSON":
                entities["persons"].append(ent.text)
            elif ent.label_ == "DATE":
                entities["dates"].append(ent.text)

        # Extract noun chunks as keywords
        entities["keywords"] = [chunk.text.lower() for chunk in doc.noun_chunks][:20]

    # Keyword-based department hint
    text_lower = text.lower()
    dept_scores = {}
    for dept, keywords in DEPT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            dept_scores[dept] = score

    if dept_scores:
        entities["dept_hint"] = max(dept_scores, key=dept_scores.get)
        entities["dept_scores"] = dept_scores

    log.info("Entities extracted", locations=len(entities["locations"]), keywords=len(entities["keywords"]))

    return {
        **state,
        "entities": entities,
        "location_str": location_str,
    }
