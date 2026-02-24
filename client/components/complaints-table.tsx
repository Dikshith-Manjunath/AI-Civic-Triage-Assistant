/* ──────────────────────────────────────────────
   CivicFlow — Complaints Table  (TanStack Table)
   ────────────────────────────────────────────── */

"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Ticket, Department, TicketStatus } from "@/lib/types";
import { DEPARTMENTS, STATUS_META, DEPT_LIST } from "@/lib/types";
import { StatusBadge, UrgencyBadge } from "./badges";

interface ComplaintsTableProps {
  tickets: Ticket[];
  onSelect: (t: Ticket) => void;
  /** Pre-filter by department (for dept pages) */
  filterDept?: Department;
}

export default function ComplaintsTable({ tickets, onSelect, filterDept }: ComplaintsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Apply dept pre-filter
  const data = useMemo(
    () => (filterDept ? tickets.filter((t) => t.dept === filterDept) : tickets),
    [tickets, filterDept]
  );

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ getValue }) => {
          const id = getValue<string>();
          return <span className="font-mono text-xs text-neutral-500">{id.slice(0, 8)}</span>;
        },
        size: 90,
      },
      {
        accessorKey: "timestamp",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-left"
            onClick={() => column.toggleSorting()}
          >
            Time <ArrowUpDown size={12} className="text-neutral-400" />
          </button>
        ),
        cell: ({ getValue }) => {
          const ts = getValue<string>();
          try {
            return (
              <span className="text-xs text-neutral-500 whitespace-nowrap">
                {new Date(ts).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            );
          } catch {
            return <span className="text-xs text-neutral-400">{ts}</span>;
          }
        },
        size: 130,
      },
      {
        accessorKey: "dept",
        header: "Department",
        cell: ({ getValue }) => {
          const dept = getValue<Department>();
          return (
            <span className="text-xs font-medium text-neutral-600">
              {DEPARTMENTS[dept] ?? dept}
            </span>
          );
        },
        filterFn: "equals",
        size: 140,
      },
      {
        accessorKey: "authority",
        header: "Authority",
        cell: ({ getValue }) => (
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-neutral-600">
            {getValue<string>()}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "urgency",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-left"
            onClick={() => column.toggleSorting()}
          >
            Urgency <ArrowUpDown size={12} className="text-neutral-400" />
          </button>
        ),
        cell: ({ getValue }) => <UrgencyBadge urgency={getValue<number>()} />,
        filterFn: "equals",
        size: 90,
      },
      {
        accessorKey: "summary",
        header: "Summary",
        cell: ({ getValue }) => (
          <p className="max-w-xs truncate text-sm text-neutral-700">{getValue<string>()}</p>
        ),
        size: 300,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<TicketStatus>()} />,
        filterFn: "equals",
        size: 130,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() => onSelect(row.original)}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:border-black hover:text-black transition-colors"
          >
            View
          </button>
        ),
        size: 70,
      },
    ],
    [onSelect]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search complaints..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-black focus:outline-none"
          />
        </div>

        {/* Department filter */}
        {!filterDept && (
          <select
            value={(table.getColumn("dept")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("dept")?.setFilterValue(e.target.value || undefined)
            }
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 focus:border-black focus:outline-none"
          >
            <option value="">All Departments</option>
            {DEPT_LIST.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENTS[d]}
              </option>
            ))}
          </select>
        )}

        {/* Status filter */}
        <select
          value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
          onChange={(e) =>
            table.getColumn("status")?.setFilterValue(e.target.value || undefined)
          }
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 focus:border-black focus:outline-none"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        {/* Urgency filter */}
        <select
          value={(table.getColumn("urgency")?.getFilterValue() as string) ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            table.getColumn("urgency")?.setFilterValue(val === "" ? undefined : Number(val));
          }}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 focus:border-black focus:outline-none"
        >
          <option value="">All Urgency</option>
          <option value="0">Low</option>
          <option value="1">Medium</option>
          <option value="2">High</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-neutral-100">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400"
                    style={{ width: h.getSize() }}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-sm text-neutral-400">
                  No complaints found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-50 hover:bg-neutral-50/60 transition-colors cursor-pointer"
                  onClick={() => onSelect(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          {table.getFilteredRowModel().rows.length} complaint{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border border-neutral-200 p-1.5 hover:border-black disabled:opacity-30 disabled:hover:border-neutral-200 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border border-neutral-200 p-1.5 hover:border-black disabled:opacity-30 disabled:hover:border-neutral-200 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
