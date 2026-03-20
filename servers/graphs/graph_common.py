#!/usr/bin/env python3
"""Shared helpers for CivicFlow graph scripts."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEPARTMENT_LABELS = {
    "bbmp": "BBMP",
    "bwssb": "BWSSB",
    "bescom": "BESCOM",
    "bmtc": "BMTC",
    "bda": "BDA",
    "gba": "GBA",
    "bmrda": "BMRDA",
    "beml": "BEML",
    "ksdb": "KSDB",
}

_TOKEN_PATTERN = re.compile(r"'([^']*)'|\bnull\b")


@dataclass(frozen=True)
class SeedTicket:
    """Normalized seed-ticket row parsed from `client/lib/db.ts`."""

    ticket_no: str
    department: str
    category: str
    title: str
    description: str | None
    location: str | None
    ward: str | None
    urgency: str
    status: str
    assignee: str | None
    created_by: str | None


def department_label(code: str) -> str:
    """Return display label for department code."""
    return DEPARTMENT_LABELS.get(code.lower(), code.upper())


def default_output_path(script_file: Path) -> Path:
    """Compute default png output path from a script path."""
    return script_file.resolve().with_suffix(".png")


def parse_csv_list(value: str) -> list[str]:
    """Parse comma-separated CLI values into a cleaned list."""
    if not value.strip():
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def infer_show_graph(show: bool, no_show: bool) -> bool:
    """Infer whether user likely wants interactive plotting."""
    display_available = bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))
    return show or (display_available and not no_show)


def configure_matplotlib(interactive: bool) -> tuple[Any, bool]:
    """Configure matplotlib backend and return `(pyplot_module, can_show)`.

    In environments where GUI backends fail at first figure creation (e.g., missing
    Tcl/Tk), this falls back to the non-interactive Agg backend.
    """
    try:
        import matplotlib
    except ImportError as exc:  # pragma: no cover - import guard
        raise SystemExit(
            "matplotlib is required to render this graph. "
            "Install it with: pip install matplotlib"
        ) from exc

    if not interactive:
        matplotlib.use("Agg")

    import matplotlib.pyplot as plt

    if interactive:
        try:
            probe = plt.figure(figsize=(1, 1))
            plt.close(probe)
        except Exception:
            plt.switch_backend("Agg")
            interactive = False

    return plt, interactive


def find_default_seed_file(script_file: Path) -> Path:
    """Locate `client/lib/db.ts` by walking up from the script path."""
    resolved_script = script_file.resolve()

    for parent in [resolved_script.parent, *resolved_script.parents]:
        candidate = parent / "client" / "lib" / "db.ts"
        if candidate.exists():
            return candidate

    # Deterministic fallback to keep error messages explicit.
    return resolved_script.parents[1] / "client" / "lib" / "db.ts"


def parse_seed_tickets(seed_file: Path) -> list[SeedTicket]:
    """Parse seed-ticket rows from the TypeScript seed array in `db.ts`."""
    if not seed_file.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_file}")

    tickets: list[SeedTicket] = []

    for raw_line in seed_file.read_text(encoding="utf-8", errors="replace").splitlines():
        stripped = raw_line.strip()
        if not stripped.startswith("['"):
            continue

        tokens: list[str | None] = []
        for match in _TOKEN_PATTERN.finditer(stripped):
            if match.group(0) == "null":
                tokens.append(None)
            else:
                tokens.append(match.group(1))

        # Shape:
        # [ticket_no, department, category, title, description, location,
        #  ward, urgency, status, assignee, created_by]
        if len(tokens) < 11:
            continue

        tickets.append(
            SeedTicket(
                ticket_no=(tokens[0] or "UNKNOWN").strip(),
                department=(tokens[1] or "unknown").strip().lower(),
                category=(tokens[2] or "unknown").strip(),
                title=(tokens[3] or "").strip(),
                description=(tokens[4] or None),
                location=(tokens[5] or None),
                ward=(tokens[6] or None),
                urgency=(tokens[7] or "unknown").strip().lower(),
                status=(tokens[8] or "unknown").strip().lower(),
                assignee=(tokens[9] or None),
                created_by=(tokens[10] or None),
            )
        )

    if not tickets:
        raise ValueError(f"No seed ticket rows were parsed from: {seed_file}")

    return tickets
