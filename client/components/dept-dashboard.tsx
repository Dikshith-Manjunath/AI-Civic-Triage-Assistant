/* ──────────────────────────────────────────────
   CivicFlow — Reusable Department Dashboard
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Loading Department Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-4 border border-primary/20">
            <span className="material-symbols-outlined text-[16px]">domain</span>
            <span className="text-xs font-bold uppercase tracking-widest">Department View</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            {DEPARTMENTS[department]}
          </h1>
          <p className="text-slate-500 font-medium">
            Monitor and process department-specific complaints.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-slate-400">database</span>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dept Records</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{filtered.length.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KPICard label="Total" value={kpis.total} icon="inbox" sub="All recorded" />
        <KPICard label="Pending" value={kpis.pending} icon="schedule" sub="Awaiting triage" />
        <KPICard label="Awaiting Review" value={kpis.awaiting} icon="policy" sub="Needs approval" />
        <KPICard label="High Urgency" value={kpis.high} icon="warning" sub="Needs fast action" />
        <KPICard label="Resolved" value={kpis.resolved} icon="task_alt" sub="Issues fixed" />
      </div>

      {/* Status breakdown */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <span className="material-symbols-outlined">donut_large</span>
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Status Breakdown
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => (
            <div key={s} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 text-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mb-1">{statusCounts[s] ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{STATUS_META[s].label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <span className="material-symbols-outlined">table_chart</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Department Complaints</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Manage and update active tickets</p>
            </div>
          </div>
        </div>
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
