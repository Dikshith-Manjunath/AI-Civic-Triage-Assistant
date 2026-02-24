/* ──────────────────────────────────────────────
   CivicFlow — Reusable Department Dashboard
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Inbox, Clock, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { fetchComplaints } from "@/lib/api";
import type { Ticket, Department, TicketStatus } from "@/lib/types";
import { DEPARTMENTS, STATUS_META } from "@/lib/types";
import KPICard from "./kpi-card";
import ComplaintsTable from "./complaints-table";
import TicketModal from "./ticket-modal";

interface DeptDashboardProps {
  department: Department;
}

export default function DeptDashboard({ department }: DeptDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const load = useCallback(() => {
    fetchComplaints(500)
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => tickets.filter((t) => t.dept === department),
    [tickets, department]
  );

  const kpis = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter((t) => t.status === "pending").length;
    const awaiting = filtered.filter((t) => t.status === "awaiting_approval").length;
    const resolved = filtered.filter((t) => t.status === "resolved").length;
    const high = filtered.filter((t) => t.urgency === 2).length;
    return { total, pending, awaiting, resolved, high };
  }, [filtered]);

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filtered) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-black">{DEPARTMENTS[department]}</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Department overview &middot; {filtered.length} total complaints
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KPICard label="Total" value={kpis.total} icon={<Inbox size={18} />} />
        <KPICard label="Pending" value={kpis.pending} icon={<Clock size={18} />} />
        <KPICard label="Awaiting Review" value={kpis.awaiting} icon={<ShieldAlert size={18} />} />
        <KPICard label="High Urgency" value={kpis.high} icon={<AlertTriangle size={18} />} />
        <KPICard label="Resolved" value={kpis.resolved} icon={<CheckCircle2 size={18} />} />
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Status Breakdown
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => (
            <div key={s} className="rounded-lg border border-neutral-100 px-3 py-2.5 text-center">
              <p className="text-lg font-semibold text-black tabular-nums">{statusCounts[s] ?? 0}</p>
              <p className="text-[11px] text-neutral-400">{STATUS_META[s].label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-black">Complaints</h2>
        <ComplaintsTable tickets={filtered} onSelect={setSelected} />
      </div>

      {/* Modal */}
      {selected && (
        <TicketModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
