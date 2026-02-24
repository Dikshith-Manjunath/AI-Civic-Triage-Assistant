/* ──────────────────────────────────────────────
   CivicFlow — Badge components
   ────────────────────────────────────────────── */

import { STATUS_META, URGENCY_META, DEPARTMENTS, type TicketStatus, type Department } from "@/lib/types";

export function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: number }) {
  const meta = URGENCY_META[urgency] ?? URGENCY_META[0];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function DeptBadge({ dept }: { dept: Department }) {
  const label = DEPARTMENTS[dept] ?? dept;
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
      {label}
    </span>
  );
}
