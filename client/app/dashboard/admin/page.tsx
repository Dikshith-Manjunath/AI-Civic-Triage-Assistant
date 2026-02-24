/* ──────────────────────────────────────────────
   CivicFlow — Admin Panel  (global view + actions)
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Inbox,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  XCircle,
} from "lucide-react";
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
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  if (session?.role !== "admin") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-neutral-500">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-black">Admin Panel</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Global system overview &middot; {tickets.length} total records
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        <KPICard label="Total" value={kpis.total} icon={<Inbox size={16} />} />
        <KPICard label="Pending" value={kpis.pending} icon={<Clock size={16} />} />
        <KPICard label="In Review" value={kpis.awaiting} icon={<ShieldAlert size={16} />} />
        <KPICard label="Approved" value={kpis.approved} icon={<CheckCircle2 size={16} />} />
        <KPICard label="Rejected" value={kpis.rejected} icon={<XCircle size={16} />} />
        <KPICard label="Filed" value={kpis.filed} icon={<FileCheck size={16} />} />
        <KPICard label="Resolved" value={kpis.resolved} icon={<CheckCircle2 size={16} />} />
        <KPICard label="High Urgency" value={kpis.highUrgency} icon={<AlertTriangle size={16} />} />
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Department */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            By Department
          </h2>
          <div className="space-y-2">
            {DEPT_LIST.map((d) => {
              const count = deptCounts[d] ?? 0;
              const pct = tickets.length ? (count / tickets.length) * 100 : 0;
              return (
                <div key={d} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-neutral-500 truncate">{DEPARTMENTS[d]}</span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-black transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-medium tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            By Status
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => (
              <div key={s} className="rounded-lg border border-neutral-100 px-3 py-2.5 text-center">
                <p className="text-lg font-semibold text-black tabular-nums">{statusCounts[s] ?? 0}</p>
                <p className="text-[11px] text-neutral-400">{STATUS_META[s].label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Authority breakdown */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          By Authority
        </h2>
        <div className="flex flex-wrap gap-3">
          {authCounts.map(([auth, count]) => (
            <div key={auth} className="rounded-lg border border-neutral-100 px-4 py-2.5 text-center min-w-[80px]">
              <p className="text-lg font-semibold text-black tabular-nums">{count}</p>
              <p className="text-[11px] font-mono text-neutral-400">{auth}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Full complaints table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-black">All Complaints</h2>
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
