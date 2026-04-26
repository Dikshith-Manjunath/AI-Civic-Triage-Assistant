#!/usr/bin/env python3
"""Plot grouped bars for ticket source against status distribution."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from pathlib import Path

from graph_common import (
    configure_matplotlib,
    default_output_path,
    find_default_seed_file,
    infer_show_graph,
    parse_csv_list,
    parse_seed_tickets,
)

STATUS_ORDER = ["open", "in_progress", "dispatched", "approved", "resolved", "unknown"]
STATUS_COLORS = {
    "open": "#f59e0b",
    "in_progress": "#3b82f6",
    "dispatched": "#06b6d4",
    "approved": "#8b5cf6",
    "resolved": "#10b981",
    "unknown": "#9ca3af",
}


def source_label(source: str | None) -> str:
    """Normalize source labels for plotting."""
    if not source:
        return "Unknown Source"
    return source.strip() or "Unknown Source"


def build_counts(
    tickets, dept_filter: set[str], status_filter: set[str]
) -> dict[str, Counter[str]]:
    """Build status counts grouped by source."""
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for ticket in tickets:
        if dept_filter and ticket.department not in dept_filter:
            continue
        if status_filter and ticket.status not in status_filter:
            continue
        counts[source_label(ticket.created_by)][ticket.status] += 1
    return counts


def choose_statuses(counts: dict[str, Counter[str]], requested: list[str]) -> list[str]:
    """Pick statuses to render in deterministic order."""
    found = {status for counter in counts.values() for status in counter.keys()}

    if requested:
        requested_set = {item.lower() for item in requested}
        statuses = [
            status for status in STATUS_ORDER if status in requested_set and status in found
        ]
        statuses.extend(sorted(found - set(statuses), key=lambda x: x not in requested_set))
        return statuses

    statuses = [status for status in STATUS_ORDER if status in found]
    statuses.extend(sorted(found - set(statuses)))
    return statuses


def plot_graph(args) -> None:
    """Render and save grouped source/status bars."""
    requested_show = infer_show_graph(args.show, args.no_show)
    plt, can_show = configure_matplotlib(interactive=requested_show)

    if requested_show and not can_show:
        print("Warning: interactive backend unavailable. Saving image without opening a window.")

    tickets = parse_seed_tickets(args.seed_file)
    dept_filter = {item.lower() for item in parse_csv_list(args.departments)}
    status_filter = {item.lower() for item in parse_csv_list(args.statuses)}

    counts = build_counts(tickets, dept_filter, status_filter)
    if not counts:
        raise SystemExit("No matching tickets found for the selected filters.")

    sources = [
        source for source, _ in sorted(counts.items(), key=lambda x: (-sum(x[1].values()), x[0]))
    ]
    if args.top_sources > 0:
        sources = sources[: args.top_sources]

    statuses = choose_statuses(
        {source: counts[source] for source in sources}, parse_csv_list(args.statuses)
    )
    if not statuses:
        raise SystemExit("No statuses found for the selected filters.")

    base_x = list(range(len(sources)))
    n_status = len(statuses)
    group_width = 0.82
    bar_width = group_width / n_status

    fig_w = max(10.5, len(sources) * 1.4)
    fig, ax = plt.subplots(figsize=(fig_w, 7.0))

    for idx, status in enumerate(statuses):
        offset = (idx - (n_status - 1) / 2) * bar_width
        positions = [x + offset for x in base_x]
        values = [counts[source].get(status, 0) for source in sources]
        ax.bar(
            positions,
            values,
            width=bar_width * 0.95,
            color=STATUS_COLORS.get(status, "#9ca3af"),
            label=status,
        )

    ax.set_xticks(base_x)
    ax.set_xticklabels(sources, rotation=35, ha="right")
    ax.set_ylabel("Ticket Count")
    ax.set_xlabel("Created By / Source")
    ax.set_title("Source-wise Status Distribution", fontsize=14, fontweight="bold")
    ax.grid(axis="y", linestyle="--", alpha=0.3)
    ax.legend(title="Status", frameon=False)

    totals = [sum(counts[source].values()) for source in sources]
    for x, total in zip(base_x, totals, strict=False):
        ax.text(x, total + 0.12, str(total), ha="center", va="bottom", fontsize=8.5)

    fig.tight_layout()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.output, dpi=180, bbox_inches="tight")
    print(f"Graph saved to: {args.output}")

    if can_show:
        plt.show()
    else:
        plt.close(fig)


def build_parser() -> argparse.ArgumentParser:
    """Create CLI parser."""
    default_seed = find_default_seed_file(Path(__file__))
    parser = argparse.ArgumentParser(description="Grouped source vs status ticket graph.")
    parser.add_argument(
        "--seed-file",
        type=Path,
        default=default_seed,
        help=f"Path to seed file (default: {default_seed})",
    )
    parser.add_argument(
        "--output", type=Path, default=default_output_path(Path(__file__)), help="Output png path"
    )
    parser.add_argument(
        "--departments", type=str, default="", help="Comma-separated department codes filter"
    )
    parser.add_argument("--statuses", type=str, default="", help="Comma-separated status filter")
    parser.add_argument(
        "--top-sources", type=int, default=8, help="Top N sources by volume (0 = all)"
    )
    parser.add_argument("--show", action="store_true", help="Force interactive display")
    parser.add_argument("--no-show", action="store_true", help="Save only; disable display")
    return parser


def main() -> None:
    """CLI entrypoint."""
    args = build_parser().parse_args()
    plot_graph(args)


if __name__ == "__main__":
    main()
