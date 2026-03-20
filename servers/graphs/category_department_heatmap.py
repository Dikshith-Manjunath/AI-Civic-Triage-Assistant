#!/usr/bin/env python3
"""Plot category vs department ticket density as a heatmap."""

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


def build_table(tickets, dept_filter: set[str]) -> tuple[dict[str, Counter[str]], Counter[str], Counter[str]]:
    """Build category x department count table with marginals."""
    table: dict[str, Counter[str]] = defaultdict(Counter)
    category_totals: Counter[str] = Counter()
    department_totals: Counter[str] = Counter()

    for ticket in tickets:
        if dept_filter and ticket.department not in dept_filter:
            continue
        category = ticket.category.strip() if ticket.category.strip() else "Unknown"
        table[category][ticket.department] += 1
        category_totals[category] += 1
        department_totals[ticket.department] += 1

    return table, category_totals, department_totals


def plot_heatmap(args) -> None:
    """Render and save category/department heatmap."""
    requested_show = infer_show_graph(args.show, args.no_show)
    plt, can_show = configure_matplotlib(interactive=requested_show)

    if requested_show and not can_show:
        print("Warning: interactive backend unavailable. Saving image without opening a window.")

    tickets = parse_seed_tickets(args.seed_file)
    dept_filter = {item.lower() for item in parse_csv_list(args.departments)}
    table, category_totals, department_totals = build_table(tickets, dept_filter)

    if not category_totals:
        raise SystemExit("No matching tickets found for the selected filters.")

    departments = [dept for dept, _ in sorted(department_totals.items(), key=lambda x: (-x[1], x[0]))]
    categories = [cat for cat, total in sorted(category_totals.items(), key=lambda x: (-x[1], x[0])) if total >= args.min_count]

    if args.top_categories > 0:
        categories = categories[: args.top_categories]

    if not categories or not departments:
        raise SystemExit("No categories/departments available after filters.")

    matrix: list[list[int]] = []
    for category in categories:
        row = [table[category].get(dept, 0) for dept in departments]
        matrix.append(row)

    fig_w = max(10.0, 1.2 * len(departments) + 7.0)
    fig_h = max(6.0, 0.45 * len(categories) + 4.0)
    fig, ax = plt.subplots(figsize=(fig_w, fig_h))

    im = ax.imshow(matrix, cmap=args.cmap, aspect="auto")
    cbar = fig.colorbar(im, ax=ax)
    cbar.set_label("Ticket Count")

    ax.set_xticks(range(len(departments)))
    ax.set_xticklabels([department_label(dept) for dept in departments], rotation=35, ha="right")
    ax.set_yticks(range(len(categories)))
    ax.set_yticklabels(categories)
    ax.set_xlabel("Department")
    ax.set_ylabel("Category")
    ax.set_title("Category x Department Ticket Heatmap", fontsize=14, fontweight="bold")

    if args.annotate:
        threshold = max(max(row) for row in matrix) / 2 if matrix else 0
        for r_idx, row in enumerate(matrix):
            for c_idx, value in enumerate(row):
                text_color = "white" if value > threshold else "#111827"
                ax.text(c_idx, r_idx, str(value), ha="center", va="center", fontsize=8, color=text_color)

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
    parser = argparse.ArgumentParser(description="Category x Department ticket heatmap.")
    parser.add_argument("--seed-file", type=Path, default=default_seed, help=f"Path to seed file (default: {default_seed})")
    parser.add_argument("--output", type=Path, default=default_output_path(Path(__file__)), help="Output png path")
    parser.add_argument("--departments", type=str, default="", help="Comma-separated department codes filter")
    parser.add_argument("--top-categories", type=int, default=12, help="Show top N categories (0 = all)")
    parser.add_argument("--min-count", type=int, default=1, help="Minimum total category count to include")
    parser.add_argument("--cmap", type=str, default="YlGnBu", help="Matplotlib colormap")
    parser.add_argument("--annotate", action="store_true", help="Show cell count labels")
    parser.add_argument("--show", action="store_true", help="Force interactive display")
    parser.add_argument("--no-show", action="store_true", help="Save only; disable display")
    return parser


def main() -> None:
    """CLI entrypoint."""
    args = build_parser().parse_args()
    plot_heatmap(args)


if __name__ == "__main__":
    main()
