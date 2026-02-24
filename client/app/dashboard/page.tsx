/* ──────────────────────────────────────────────
   CivicFlow — Dashboard Overview
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Inbox,
  ShieldAlert,
  FileCheck,
} from "lucide-react";
import { fetchComplaints } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Ticket } from "@/lib/types";
import { DEPARTMENTS, DEPT_LIST } from "@/lib/types";
import KPICard from "@/components/kpi-card";
import ComplaintsTable from "@/components/complaints-table";
import TicketModal from "@/components/ticket-modal";

export default function DashboardPage() {
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

  // For officers, pre-filter by their department
  const isOfficer = session?.role === "officer";
  const filtered = useMemo(
    () => (isOfficer ? tickets.filter((t) => t.dept === session?.department) : tickets),
    [tickets, isOfficer, session?.department]
  );

  // KPI computations
  const kpis = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter((t) => t.status === "pending").length;
    const awaiting = filtered.filter((t) => t.status === "awaiting_approval").length;
    const resolved = filtered.filter((t) => t.status === "resolved").length;
    const highUrgency = filtered.filter((t) => t.urgency === 2).length;
    const filed = filtered.filter((t) => t.status === "filed").length;
    return { total, pending, awaiting, resolved, highUrgency, filed };
  }, [filtered]);

  // Department breakdown
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filtered) {
      counts[t.dept] = (counts[t.dept] ?? 0) + 1;
    }
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
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-black">
          {isOfficer ? `${DEPARTMENTS[session!.department]} Dashboard` : "Operations Overview"}
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Welcome back, {session?.name}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Total" value={kpis.total} icon={<Inbox size={18} />} />
        <KPICard label="Pending" value={kpis.pending} icon={<Clock size={18} />} />
        <KPICard
          label="Awaiting Review"
          value={kpis.awaiting}
          icon={<ShieldAlert size={18} />}
          sub={kpis.awaiting > 0 ? "Needs attention" : undefined}
        />
        <KPICard label="High Urgency" value={kpis.highUrgency} icon={<AlertTriangle size={18} />} />
        <KPICard label="Filed" value={kpis.filed} icon={<FileCheck size={18} />} />
        <KPICard label="Resolved" value={kpis.resolved} icon={<CheckCircle2 size={18} />} />
      </div>

      {/* Department breakdown (admin only) */}
      {!isOfficer && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            By Department
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {DEPT_LIST.map((d) => (
              <div key={d} className="rounded-lg border border-neutral-100 px-3 py-2.5 text-center">
                <p className="text-lg font-semibold text-black tabular-nums">{deptCounts[d] ?? 0}</p>
                <p className="text-[11px] text-neutral-400">{DEPARTMENTS[d]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complaints table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-black">Recent Complaints</h2>
        <ComplaintsTable
          tickets={filtered}
          onSelect={setSelected}
        />
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
