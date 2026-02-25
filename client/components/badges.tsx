/* ──────────────────────────────────────────────
   CivicFlow — Badge components
   ────────────────────────────────────────────── */

import { STATUS_META, URGENCY_META, DEPARTMENTS, type TicketStatus, type Department } from "@/lib/types";

export function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  // Map our old colors to Stitch palette
  const colorMap: Record<string, string> = {
    "bg-neutral-100 text-neutral-600 border-neutral-200": "bg-slate-100 text-slate-700 border-slate-200",
    "bg-blue-50 text-blue-700 border-blue-200": "bg-blue-50 text-blue-700 border-blue-200",
    "bg-purple-50 text-purple-700 border-purple-200": "bg-purple-50 text-purple-700 border-purple-200",
    "bg-green-50 text-green-700 border-green-200": "bg-accent-success/10 text-accent-success border-accent-success/20",
    "bg-neutral-800 text-neutral-100": "bg-slate-800 text-white",
    "bg-red-50 text-red-700 border-red-200": "bg-accent-danger/10 text-accent-danger border-accent-danger/20",
  };

  const mappedClass = colorMap[meta.className] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider border ${mappedClass}`}>
      {meta.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: number }) {
  const meta = URGENCY_META[urgency] ?? URGENCY_META[0];

  const colorMap: Record<string, string> = {
    "text-neutral-500 bg-neutral-100": "text-slate-600 bg-slate-100",
    "text-amber-600 bg-amber-50": "text-accent-warning bg-accent-warning/10",
    "text-red-600 bg-red-50": "text-accent-danger bg-accent-danger/10",
  };

  const mappedClass = colorMap[meta.className] || "text-slate-600 bg-slate-100";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${mappedClass}`}>
      {meta.label}
    </span>
  );
}

export function DeptBadge({ dept }: { dept: Department }) {
  const label = DEPARTMENTS[dept] ?? dept;
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
      {label}
    </span>
  );
}
