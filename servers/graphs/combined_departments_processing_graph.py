#!/usr/bin/env python3
"""Display a combined graph of CivicFlow departments, data, and processing flow.

This script reads seed ticket data from `client/lib/db.ts` and builds a
two-panel visualization:
1) Department-wise ticket volume with status breakdown.
2) Complaint processing flow with department routing.

Usage:
    python graphs/combined_departments_processing_graph.py
    python graphs/combined_departments_processing_graph.py --no-show
    python graphs/combined_departments_processing_graph.py --output graphs/combined_graph.png
"""

from __future__ import annotations

import argparse
import math
import os
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

plt: Any = None
FancyArrowPatch: Any = None
FancyBboxPatch: Any = None


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

DEPARTMENT_COLORS = {
    "bbmp": "#1f77b4",
    "bwssb": "#2ca02c",
    "bescom": "#ff7f0e",
    "bmtc": "#d62728",
    "bda": "#9467bd",
    "gba": "#8c564b",
    "bmrda": "#17becf",
    "beml": "#bcbd22",
    "ksdb": "#7f7f7f",
}

STATUS_COLORS = {
    "open": "#f59e0b",
    "in_progress": "#3b82f6",
    "dispatched": "#14b8a6",
    "approved": "#8b5cf6",
    "resolved": "#10b981",
}


def find_default_seed_file(script_file: Path) -> Path:
    """Locate `client/lib/db.ts` by walking up from this script path.

    This supports running the script from either:
    - `<repo>/graphs/...`
    - `<repo>/servers/graphs/...`
    """
    resolved_script = script_file.resolve()

    for parent in [resolved_script.parent, *resolved_script.parents]:
        candidate = parent / "client" / "lib" / "db.ts"
        if candidate.exists():
            return candidate

    # Keep a deterministic fallback path for clearer errors.
    return resolved_script.parents[1] / "client" / "lib" / "db.ts"


def configure_matplotlib(interactive: bool) -> bool:
    """Configure matplotlib backend and imports.

    Returns:
        True if interactive display is available, else False.
    """
    global plt, FancyArrowPatch, FancyBboxPatch

    try:
        import matplotlib
    except ImportError as exc:  # pragma: no cover - import guard
        raise SystemExit(
            "matplotlib is required to render this graph. "
            "Install it with: pip install matplotlib"
        ) from exc

    if not interactive:
        matplotlib.use("Agg")

    import matplotlib.pyplot as _plt
    from matplotlib.patches import FancyArrowPatch as _FancyArrowPatch
    from matplotlib.patches import FancyBboxPatch as _FancyBboxPatch

    # Some environments import pyplot fine but fail on first figure creation
    # when GUI toolkit files (e.g., Tcl/Tk) are not available.
    if interactive:
        try:
            probe = _plt.figure(figsize=(1, 1))
            _plt.close(probe)
        except Exception:
            _plt.switch_backend("Agg")
            interactive = False

    plt = _plt
    FancyArrowPatch = _FancyArrowPatch
    FancyBboxPatch = _FancyBboxPatch
    return interactive


def parse_seed_ticket_data(seed_file: Path) -> tuple[Counter[str], dict[str, Counter[str]]]:
    """Parse department and status counts from TS seed rows in db.ts."""
    if not seed_file.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_file}")

    dept_counts: Counter[str] = Counter()
    status_by_dept: dict[str, Counter[str]] = defaultdict(Counter)

    # Capture quoted strings and bare nulls from each seed row.
    token_pattern = re.compile(r"'([^']*)'|\bnull\b")

    for raw_line in seed_file.read_text(encoding="utf-8", errors="replace").splitlines():
        stripped = raw_line.strip()
        if not stripped.startswith("['"):
            continue

        tokens: list[str | None] = []
        for match in token_pattern.finditer(stripped):
            if match.group(0) == "null":
                tokens.append(None)
            else:
                tokens.append(match.group(1))

        # Expected shape:
        # [ticket_no, department, category, title, description, location,
        #  ward, urgency, status, assignee, created_by]
        if len(tokens) < 9:
            continue

        department = (tokens[1] or "unknown").strip().lower()
        status = (tokens[8] or "unknown").strip().lower()

        dept_counts[department] += 1
        status_by_dept[department][status] += 1

    if not dept_counts:
        raise ValueError(f"No seed ticket rows were parsed from: {seed_file}")

    return dept_counts, status_by_dept


def _display_dept(code: str) -> str:
    """Return human-friendly department short code."""
    return DEPARTMENT_LABELS.get(code.lower(), code.upper())


def _status_order(status_by_dept: dict[str, Counter[str]]) -> list[str]:
    """Build stable status ordering for stacked bars."""
    preferred = ["open", "in_progress", "dispatched", "approved", "resolved"]
    found = {status for counts in status_by_dept.values() for status in counts.keys()}
    ordered = [s for s in preferred if s in found]
    ordered.extend(sorted(found - set(ordered)))
    return ordered


def plot_department_data(ax, dept_counts: Counter[str], status_by_dept: dict[str, Counter[str]]) -> None:
    """Plot department ticket volume and status breakdown."""
    departments = [dept for dept, _ in sorted(dept_counts.items(), key=lambda x: (-x[1], x[0]))]
    labels = [_display_dept(d) for d in departments]

    bottoms = [0] * len(departments)
    statuses = _status_order(status_by_dept)

    for status in statuses:
        values = [status_by_dept[d].get(status, 0) for d in departments]
        color = STATUS_COLORS.get(status, "#9ca3af")
        ax.bar(labels, values, bottom=bottoms, label=status.replace("_", " "), color=color)
        bottoms = [b + v for b, v in zip(bottoms, values)]

    for idx, total in enumerate(bottoms):
        ax.text(idx, total + 0.08, str(total), ha="center", va="bottom", fontsize=9, color="#111827")

    ax.set_title("Combined Department Data (Seed Tickets)", fontsize=12, fontweight="bold")
    ax.set_ylabel("Ticket Count")
    ax.grid(axis="y", alpha=0.25, linestyle="--")
    ax.legend(title="Status", frameon=False)


def _draw_node(
    ax,
    x: float,
    y: float,
    text: str,
    width: float = 0.18,
    height: float = 0.08,
    facecolor: str = "#eff6ff",
    edgecolor: str = "#1d4ed8",
) -> tuple[float, float]:
    """Draw a rounded node and return its center."""
    patch = FancyBboxPatch(
        (x - width / 2, y - height / 2),
        width,
        height,
        boxstyle="round,pad=0.012,rounding_size=0.018",
        linewidth=1.2,
        edgecolor=edgecolor,
        facecolor=facecolor,
    )
    ax.add_patch(patch)
    ax.text(x, y, text, ha="center", va="center", fontsize=8.5, color="#111827")
    return (x, y)


def _draw_arrow(ax, start: tuple[float, float], end: tuple[float, float], rad: float = 0.0) -> None:
    """Draw a directed arrow between two points."""
    arrow = FancyArrowPatch(
        start,
        end,
        arrowstyle="-|>",
        mutation_scale=12,
        linewidth=1.1,
        color="#334155",
        connectionstyle=f"arc3,rad={rad}",
    )
    ax.add_patch(arrow)


def plot_processing_flow(ax, dept_counts: Counter[str]) -> None:
    """Plot complaint processing flow with combined department routing."""
    ax.set_title("Complaint Data Processing and Department Routing", fontsize=12, fontweight="bold")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    total_tickets = sum(dept_counts.values())
    ax.text(
        0.02,
        0.97,
        f"Total Parsed Tickets: {total_tickets}",
        fontsize=10,
        fontweight="bold",
        color="#0f172a",
    )

    n_input = _draw_node(ax, 0.12, 0.82, "Citizen Inputs\n(Text/Audio/PDF/Image)", width=0.22)
    n_preprocess = _draw_node(ax, 0.36, 0.82, "Preprocess\nTranscribe/Extract/Unify", width=0.22)
    n_embed = _draw_node(ax, 0.58, 0.82, "Embedding +\nSimilarity Search", width=0.2)
    n_classify = _draw_node(ax, 0.8, 0.82, "LLM Classification\nDept/Urgency", width=0.18)
    n_router = _draw_node(ax, 0.8, 0.64, "Authority Router", width=0.16, facecolor="#ecfeff", edgecolor="#0f766e")
    n_approval = _draw_node(ax, 0.2, 0.18, "Approval / Dispatch", width=0.2, facecolor="#f0fdf4", edgecolor="#15803d")
    n_storage = _draw_node(ax, 0.46, 0.18, "Storage + Dashboard\n(ClickHouse / UI)", width=0.24, facecolor="#fffbeb", edgecolor="#b45309")

    _draw_arrow(ax, n_input, n_preprocess)
    _draw_arrow(ax, n_preprocess, n_embed)
    _draw_arrow(ax, n_embed, n_classify)
    _draw_arrow(ax, n_classify, n_router)

    sorted_departments = sorted(dept_counts.items(), key=lambda x: (-x[1], x[0]))
    cols = 3
    rows = max(1, math.ceil(len(sorted_departments) / cols))
    x_positions = [0.46, 0.64, 0.82]
    y_top = 0.45
    y_step = 0.12 if rows <= 2 else 0.09

    for idx, (dept, count) in enumerate(sorted_departments):
        row = idx // cols
        col = idx % cols
        x = x_positions[col]
        y = y_top - row * y_step
        dept_label = _display_dept(dept)
        color = DEPARTMENT_COLORS.get(dept, "#64748b")

        node = _draw_node(
            ax,
            x,
            y,
            f"{dept_label}\n{count} ticket(s)",
            width=0.16,
            height=0.075,
            facecolor="#f8fafc",
            edgecolor=color,
        )
        _draw_arrow(ax, n_router, node, rad=0.02 * (col - 1))
        _draw_arrow(ax, node, n_approval, rad=0.06)

    _draw_arrow(ax, n_approval, n_storage)


def create_graph(seed_file: Path, output_path: Path, show_graph: bool) -> None:
    """Create and render the combined graph."""
    if plt is None:
        raise RuntimeError("Matplotlib is not configured. Call configure_matplotlib() before create_graph().")

    dept_counts, status_by_dept = parse_seed_ticket_data(seed_file)

    fig = plt.figure(figsize=(16, 8.5))
    grid = fig.add_gridspec(1, 2, width_ratios=[1.0, 1.25])
    ax_left = fig.add_subplot(grid[0, 0])
    ax_right = fig.add_subplot(grid[0, 1])

    plot_department_data(ax_left, dept_counts, status_by_dept)
    plot_processing_flow(ax_right, dept_counts)

    fig.suptitle(
        "CivicFlow Combined Departments: Data and Processing Graph",
        fontsize=16,
        fontweight="bold",
        color="#0f172a",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.96))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=180, bbox_inches="tight")
    print(f"Graph saved to: {output_path}")

    if show_graph:
        plt.show()
    else:
        plt.close(fig)


def build_arg_parser() -> argparse.ArgumentParser:
    """Build CLI arguments for the graph script."""
    default_seed = find_default_seed_file(Path(__file__))
    default_output = Path(__file__).resolve().with_name("combined_departments_processing_graph.png")

    parser = argparse.ArgumentParser(
        description="Display a combined graph of departments, their ticket data, and processing flow."
    )
    parser.add_argument(
        "--seed-file",
        type=Path,
        default=default_seed,
        help=f"Path to the ticket seed file (default: {default_seed})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=default_output,
        help=f"Output image path (default: {default_output})",
    )
    parser.add_argument(
        "--show",
        action="store_true",
        help="Force opening an interactive plot window.",
    )
    parser.add_argument(
        "--no-show",
        action="store_true",
        help="Do not open a plot window; only save the image.",
    )
    return parser


def main() -> None:
    """CLI entrypoint."""
    parser = build_arg_parser()
    args = parser.parse_args()

    display_available = bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))
    show_graph = args.show or (display_available and not args.no_show)

    # Prefer interactive mode only when requested by environment/flags,
    # but gracefully fall back to a headless backend if GUI deps are missing.
    can_show = configure_matplotlib(interactive=show_graph)
    if show_graph and not can_show:
        print("Warning: interactive backend unavailable. Saving image without opening a window.")
        show_graph = False

    if args.show and not display_available:
        print("Warning: no display detected. The graph will be saved, but GUI display may fail.")

    create_graph(seed_file=args.seed_file, output_path=args.output, show_graph=show_graph)


if __name__ == "__main__":
    main()
