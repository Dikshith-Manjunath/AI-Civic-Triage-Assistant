/* ──────────────────────────────────────────────
   CivicFlow — Admin Panel  (global view + actions)
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchComplaints } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Ticket, TicketStatus, Department } from "@/lib/types";
import { DEPARTMENTS, DEPT_LIST, STATUS_META } from "@/lib/types";
import KPICard from "@/components/kpi-card";
import ComplaintsTable from "@/components/complaints-table";
import TicketModal from "@/components/ticket-modal";

export default function AdminPage() {
  const { session } = useAuth();
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

  // KPIs
  const kpis = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === "pending").length;
    const awaiting = tickets.filter((t) => t.status === "awaiting_approval").length;
    const approved = tickets.filter((t) => t.status === "approved").length;
    const rejected = tickets.filter((t) => t.status === "rejected").length;
    const filed = tickets.filter((t) => t.status === "filed").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    const highUrgency = tickets.filter((t) => t.urgency === 2).length;
    return { total, pending, awaiting, approved, rejected, filed, resolved, highUrgency };
  }, [tickets]);

  // Department breakdown
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) counts[t.dept] = (counts[t.dept] ?? 0) + 1;
    return counts;
  }, [tickets]);

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [tickets]);

  // Authority breakdown
  const authCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) counts[t.authority] = (counts[t.authority] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Loading System Data...</p>
      </div>
    );
  }

  if (session?.role !== "admin") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-slate-500">
        <span className="material-symbols-outlined text-5xl opacity-50">gpp_maybe</span>
        <p className="text-sm font-bold uppercase tracking-widest">Administrator Access Required</p>
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
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span className="text-xs font-bold uppercase tracking-widest">Global Overview</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            System Admin Panel
          </h1>
          <p className="text-slate-500 font-medium">
            Monitor all system activity across authorities and departments.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-slate-400">database</span>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Records</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{tickets.length.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        <KPICard label="Total" value={kpis.total} icon="inbox" sub="All recorded" trend={{ value: "12%", positive: true }} />
        <KPICard label="Pending" value={kpis.pending} icon="schedule" sub="Awaiting triage" />
        <KPICard label="In Review" value={kpis.awaiting} icon="policy" sub="Needs authority approval" />
        <KPICard label="Approved" value={kpis.approved} icon="check_circle" sub="Ready for filing" />
        <KPICard label="Rejected" value={kpis.rejected} icon="cancel" sub="Invalid complaints" trend={{ value: "2%", positive: true }} />
        <KPICard label="Filed" value={kpis.filed} icon="publish" sub="Sent to departments" />
        <KPICard label="Resolved" value={kpis.resolved} icon="task_alt" sub="Issue fixed" trend={{ value: "8%", positive: true }} />
        <KPICard label="High Urgency" value={kpis.highUrgency} icon="warning" sub="Needs immediate action" />
      </div>

      {/* Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <span className="material-symbols-outlined">domain</span>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
              Department Workload
            </h2>
          </div>

          <div className="space-y-4">
            {DEPT_LIST.map((d) => {
              const count = deptCounts[d] ?? 0;
              const pct = tickets.length ? (count / tickets.length) * 100 : 0;
              return (
                <div key={d} className="flex items-center gap-4 group">
                  <span className="w-32 text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{DEPARTMENTS[d]}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-1000 ease-out group-hover:opacity-80"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-bold font-mono text-slate-700 dark:text-slate-300">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <span className="material-symbols-outlined">donut_large</span>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
              Status Distribution
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => (
              <div key={s} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 text-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mb-1">{statusCounts[s] ?? 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{STATUS_META[s].label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Authority breakdown */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
            <span className="material-symbols-outlined">corporate_fare</span>
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Tickets By Authority
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">Volume of complaints assigned to municipal authorities.</p>

        <div className="flex flex-wrap gap-3">
          {authCounts.map(([auth, count]) => (
            <div key={auth} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-center min-w-[100px] shadow-sm flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                {auth.charAt(0)}
              </span>
              <div className="text-left">
                <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums leading-none mb-1">{count}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none">{auth}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full complaints table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <span className="material-symbols-outlined">table_chart</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Global Complaint Registry</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Comprehensive view of all system tickets</p>
            </div>
          </div>
        </div>
        <ComplaintsTable tickets={tickets} onSelect={setSelected} />
      </div>

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
