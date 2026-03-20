#!/usr/bin/env python3
"""Plot department-wise ticket distribution with urgency as stacked bars."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from pathlib import Path

from graph_common import (
    configure_matplotlib,
    default_output_path,
    department_label,
    find_default_seed_file,
    infer_show_graph,
    parse_csv_list,
    parse_seed_tickets,
)

URGENCY_ORDER = ["low", "medium", "high", "critical", "unknown"]
URGENCY_COLORS = {
    "low": "#22c55e",
    "medium": "#3b82f6",
    "high": "#f59e0b",
    "critical": "#ef4444",
    "unknown": "#9ca3af",
}


def build_counts(tickets, dept_filter: set[str]) -> dict[str, Counter[str]]:
    """Build urgency counts per department."""
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for ticket in tickets:
        if dept_filter and ticket.department not in dept_filter:
            continue
        counts[ticket.department][ticket.urgency] += 1
    return counts


def order_departments(counts: dict[str, Counter[str]], sort_by: str) -> list[str]:
    """Sort departments according to selected strategy."""
    if sort_by == "alphabetical":
        return sorted(counts.keys())
    if sort_by == "critical":
        return sorted(
            counts.keys(),
            key=lambda d: (-counts[d].get("critical", 0), -sum(counts[d].values()), d),
        )
    return sorted(counts.keys(), key=lambda d: (-sum(counts[d].values()), d))


def plot_graph(counts: dict[str, Counter[str]], args) -> None:
    """Render and save the urgency stacked bar graph."""
    requested_show = infer_show_graph(args.show, args.no_show)
    plt, can_show = configure_matplotlib(interactive=requested_show)

    if requested_show and not can_show:
        print("Warning: interactive backend unavailable. Saving image without opening a window.")

    departments = order_departments(counts, args.sort_by)
    if args.top > 0:
        departments = departments[: args.top]

    if not departments:
        raise SystemExit("No matching tickets found for the selected filters.")

    labels = [department_label(dept) for dept in departments]
    totals = [sum(counts[dept].values()) for dept in departments]

    fig, ax = plt.subplots(figsize=(12.5, 7.2))
    bottoms = [0.0 for _ in departments]

    for urgency in URGENCY_ORDER:
        values = [counts[dept].get(urgency, 0) for dept in departments]
        if args.normalize:
            values = [100.0 * v / t if t else 0.0 for v, t in zip(values, totals)]

        ax.bar(
            labels,
            values,
            bottom=bottoms,
            label=urgency,
            color=URGENCY_COLORS.get(urgency, "#9ca3af"),
        )
        bottoms = [b + v for b, v in zip(bottoms, values)]

    for idx, total in enumerate(totals):
        y = bottoms[idx] + (1.0 if args.normalize else 0.12)
        suffix = "" if args.normalize else " ticket(s)"
        ax.text(idx, y, f"{total}{suffix}", ha="center", va="bottom", fontsize=9)

    ax.set_title("Department Ticket Mix by Urgency", fontsize=14, fontweight="bold")
    ax.set_ylabel("Percentage (%)" if args.normalize else "Ticket Count")
    ax.set_xlabel("Department")
    ax.grid(axis="y", linestyle="--", alpha=0.3)
    ax.legend(title="Urgency", frameon=False)
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
    parser = argparse.ArgumentParser(description="Department-wise urgency stacked graph.")
    parser.add_argument("--seed-file", type=Path, default=default_seed, help=f"Path to seed file (default: {default_seed})")
    parser.add_argument("--output", type=Path, default=default_output_path(Path(__file__)), help="Output png path")
    parser.add_argument("--departments", type=str, default="", help="Comma-separated department codes filter")
    parser.add_argument("--top", type=int, default=0, help="Show only top N departments (0 = all)")
    parser.add_argument("--sort-by", choices=["total", "critical", "alphabetical"], default="total", help="Department sort strategy")
    parser.add_argument("--normalize", action="store_true", help="Display bars as percentages")
    parser.add_argument("--show", action="store_true", help="Force interactive display")
    parser.add_argument("--no-show", action="store_true", help="Save only; disable display")
    return parser


def main() -> None:
    """CLI entrypoint."""
    args = build_parser().parse_args()
    tickets = parse_seed_tickets(args.seed_file)
    dept_filter = {item.lower() for item in parse_csv_list(args.departments)}
    counts = build_counts(tickets, dept_filter)
    plot_graph(counts, args)


if __name__ == "__main__":
    main()
