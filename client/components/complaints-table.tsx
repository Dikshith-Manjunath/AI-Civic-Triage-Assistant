/* ──────────────────────────────────────────────
   CivicFlow — Complaints Table (Stitch match)
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
import type { Ticket, Department, TicketStatus } from "@/lib/types";
import { DEPARTMENTS, STATUS_META, DEPT_LIST } from "@/lib/types";

// Recreate badges exactly as defined in Stitch markup for the rows
function StatusBadgeInline({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  let bg = "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400";
  if (meta.color === "blue") bg = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (meta.color === "yellow") bg = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (meta.color === "green") bg = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (meta.color === "red") bg = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${bg}`}>
      {meta.label}
    </span>
  );
}

// Map dept to appropriate Material Symbol icon
function getDeptIcon(dept: string) {
  const iconMap: Record<string, string> = {
    roads: "add_road",
    water: "water_drop",
    electricity: "bolt",
    sanitation: "cleaning_services",
    transport: "directions_bus",
    housing: "home",
    planning: "architecture"
  };
  return iconMap[dept] || "corporate_fare";
}

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
        accessorKey: "dept",
        header: "Authority",
        cell: ({ row }) => {
          const dept = row.original.dept;
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary dark:text-blue-400">
                <span className="material-symbols-outlined text-sm font-bold">{getDeptIcon(dept)}</span>
              </div>
              <span className="font-semibold text-sm">{DEPARTMENTS[dept] ?? dept}</span>
              <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 ml-2">#{row.original.id.slice(0, 6)}</span>
            </div>
          );
        },
        filterFn: "equals",
        size: 200,
      },
      {
        accessorKey: "summary",
        header: "Issue Summary",
        cell: ({ getValue }) => (
          <p className="max-w-xs truncate text-sm font-medium text-slate-700 dark:text-slate-300">{getValue<string>()}</p>
        ),
        size: 250,
      },
      {
        accessorKey: "timestamp",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-left font-bold text-slate-500 uppercase tracking-wider"
            onClick={() => column.toggleSorting()}
          >
            Reported <span className="material-symbols-outlined text-[16px]">swap_vert</span>
          </button>
        ),
        cell: ({ getValue }) => {
          const ts = getValue<string>();
          try {
            return (
              <span className="text-sm text-slate-500 font-medium whitespace-nowrap">
                {new Date(ts).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            );
          } catch {
            return <span className="text-sm text-slate-400">{ts}</span>;
          }
        },
        size: 140,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadgeInline status={getValue<TicketStatus>()} />,
        filterFn: "equals",
        size: 140,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end pr-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(row.original);
              }}
              className="text-primary text-sm font-semibold hover:underline"
            >
              View Ticket
            </button>
          </div>
        ),
        size: 100,
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
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 px-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            placeholder="Search tickets by ID, authority, or keyword..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-500 outline-none transition-all"
          />
        </div>

        <div className="flex gap-2">
          {/* Department filter */}
          {!filterDept && (
            <select
              value={(table.getColumn("dept")?.getFilterValue() as string) ?? ""}
              onChange={(e) =>
                table.getColumn("dept")?.setFilterValue(e.target.value || undefined)
              }
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1em] bg-[right_0.5rem_center] bg-no-repeat"
            >
              <option value="">All Authorities</option>
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
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1em] bg-[right_0.5rem_center] bg-no-repeat"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"
                    style={{ width: h.getSize() }}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-24 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">inbox</span>
                  <p className="text-sm font-medium text-slate-500">No tickets match your filters.</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => onSelect(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
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
      <div className="flex items-center justify-between pt-4 pb-2 px-6 border-t border-slate-200 dark:border-slate-800">
        <p className="text-sm font-medium text-slate-500">
          Showing <span className="text-slate-900 dark:text-white font-bold">{table.getRowModel().rows.length}</span> out of <span className="text-slate-900 dark:text-white font-bold">{table.getFilteredRowModel().rows.length}</span> records
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span> Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Next <span className="material-symbols-outlined text-[18px]">navigate_next</span>
          </button>
        </div>
      </div>
    </div>
  );
}
