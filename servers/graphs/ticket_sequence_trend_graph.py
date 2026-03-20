#!/usr/bin/env python3
"""Plot cumulative ticket trends over ticket-number sequence by department."""

from __future__ import annotations

import argparse
import re
from collections import Counter
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

DEPT_COLORS = {
    "bbmp": "#1f77b4",
    "bwssb": "#2ca02c",
    "bescom": "#ff7f0e",
    "bmtc": "#d62728",
    "bda": "#9467bd",
    "gba": "#8c564b",
}


def ticket_sort_key(ticket_no: str) -> tuple[int, str]:
    """Sort ticket IDs by numeric suffix then full ticket string."""
    match = re.search(r"(\d+)$", ticket_no)
    number = int(match.group(1)) if match else 0
    return number, ticket_no


def choose_departments(tickets, requested: list[str], max_departments: int) -> list[str]:
    """Select departments to render."""
    volumes: Counter[str] = Counter(ticket.department for ticket in tickets)

    if requested:
        chosen = [dept.lower() for dept in requested if dept.lower() in volumes]
    else:
        chosen = [dept for dept, _ in sorted(volumes.items(), key=lambda x: (-x[1], x[0]))]

    if max_departments > 0:
        chosen = chosen[:max_departments]

    return chosen


def build_cumulative_series(tickets, departments: list[str]) -> tuple[list[int], dict[str, list[int]]]:
    """Build cumulative count series across ticket sequence."""
    dept_set = set(departments)
    filtered = [ticket for ticket in tickets if ticket.department in dept_set]
    filtered.sort(key=lambda t: ticket_sort_key(t.ticket_no))

    running = {dept: 0 for dept in departments}
    series = {dept: [] for dept in departments}
    x_values: list[int] = []

    for index, ticket in enumerate(filtered, start=1):
        running[ticket.department] += 1
        x_values.append(index)
        for dept in departments:
            series[dept].append(running[dept])

    return x_values, series


def downsample(x_values: list[int], y_values: list[int], step: int) -> tuple[list[int], list[int]]:
    """Downsample points for readability while preserving the final point."""
    if step <= 1 or len(x_values) <= 2:
        return x_values, y_values

    sampled_x = x_values[::step]
    sampled_y = y_values[::step]

    if sampled_x[-1] != x_values[-1]:
        sampled_x.append(x_values[-1])
        sampled_y.append(y_values[-1])

    return sampled_x, sampled_y


def plot_graph(args) -> None:
    """Render and save cumulative trend graph."""
    requested_show = infer_show_graph(args.show, args.no_show)
    plt, can_show = configure_matplotlib(interactive=requested_show)

    if requested_show and not can_show:
        print("Warning: interactive backend unavailable. Saving image without opening a window.")

    tickets = parse_seed_tickets(args.seed_file)
    requested_departments = parse_csv_list(args.departments)
    departments = choose_departments(tickets, requested_departments, args.max_departments)

    if not departments:
        raise SystemExit("No matching departments found for trend graph.")

    x_values, series = build_cumulative_series(tickets, departments)
    if not x_values:
        raise SystemExit("No ticket sequence points available after department filtering.")

    fig, ax = plt.subplots(figsize=(12.5, 7.0))

    for idx, department in enumerate(departments):
        sampled_x, sampled_y = downsample(x_values, series[department], args.step)
        color = DEPT_COLORS.get(department, plt.cm.tab20(idx % 20))
        marker = "o" if len(sampled_x) <= 45 else None
        ax.plot(
            sampled_x,
            sampled_y,
            label=department_label(department),
            color=color,
            linewidth=2.2,
            marker=marker,
            markersize=3.5,
        )

    ax.set_title("Cumulative Ticket Trend by Department", fontsize=14, fontweight="bold")
    ax.set_xlabel("Ticket Sequence Index (sorted by numeric ticket ID)")
    ax.set_ylabel("Cumulative Tickets")
    ax.grid(linestyle="--", alpha=0.3)
    ax.legend(title="Department", frameon=False)

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
    parser = argparse.ArgumentParser(description="Cumulative trend graph using ticket sequence.")
    parser.add_argument("--seed-file", type=Path, default=default_seed, help=f"Path to seed file (default: {default_seed})")
    parser.add_argument("--output", type=Path, default=default_output_path(Path(__file__)), help="Output png path")
    parser.add_argument("--departments", type=str, default="", help="Comma-separated department codes filter")
    parser.add_argument("--max-departments", type=int, default=6, help="Maximum departments to render (0 = all)")
    parser.add_argument("--step", type=int, default=1, help="Sample every N points for readability")
    parser.add_argument("--show", action="store_true", help="Force interactive display")
    parser.add_argument("--no-show", action="store_true", help="Save only; disable display")
    return parser


def main() -> None:
    """CLI entrypoint."""
    args = build_parser().parse_args()
    plot_graph(args)


if __name__ == "__main__":
    main()
