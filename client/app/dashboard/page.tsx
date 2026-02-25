/* ──────────────────────────────────────────────
   CivicFlow — Dashboard Overview
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-primary dark:text-white tracking-tight">
            {isOfficer ? `${DEPARTMENTS[session!.department]} Dashboard` : "Global Overview"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            System-wide monitoring for Bengaluru Metropolitan services.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">calendar_today</span>
            Last 30 Days
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-lg">file_download</span>
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Total Tickets"
          value={kpis.total}
          icon="confirmation_number"
          trend={{ value: "+12.5%", positive: true }}
          color="blue"
        />
        <KPICard
          label="Pending Actions"
          value={kpis.pending + kpis.awaiting}
          icon="pending_actions"
          trend={{ value: "+5.2%", positive: false }}
          color="yellow"
        />
        <KPICard
          label="Resolved Today"
          value={kpis.resolved || 185} // Mock data fallback for design purposes
          icon="check_circle"
          trend={{ value: "-8.1%", positive: false }}
          color="green"
        />
        <KPICard
          label="High Urgency"
          value={kpis.highUrgency}
          icon="priority_high"
          trend={{ value: "Critical Alert", positive: false }}
          color="purple"
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Trends */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-lg">Ticket Trends (30 Days)</h4>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-primary"></span> New
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-accent-success"></span> Resolved
              </span>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 px-2">
            {[
              { total: 40, resolved: 60 },
              { total: 60, resolved: 75 },
              { total: 55, resolved: 80 },
              { total: 75, resolved: 65 },
              { total: 90, resolved: 90 },
              { total: 65, resolved: 40 },
              { total: 80, resolved: 85 }
            ].map((d, i) => (
              <div key={i} className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-t-lg relative group overflow-hidden" style={{ height: `${d.total}%` }}>
                <div className="absolute bottom-0 w-full bg-primary/20 h-full"></div>
                <div className="absolute bottom-0 w-full bg-primary transition-all duration-500 ease-out" style={{ height: `${d.resolved}%` }}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>

        {/* By Authority Pie Chart Mockup */}
        {!isOfficer && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="font-bold text-lg mb-6">By Authority</h4>
            <div className="flex justify-center py-4">
              <div className="relative w-48 h-48 rounded-full border-[16px] border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[16px] border-primary border-r-transparent border-b-transparent border-l-transparent rotate-[45deg]"></div>
                <div className="absolute inset-0 rounded-full border-[16px] border-blue-400 border-r-transparent border-t-transparent border-l-transparent rotate-[160deg]"></div>
                <div className="absolute inset-0 rounded-full border-[16px] border-accent-success border-r-transparent border-t-transparent border-b-transparent rotate-[280deg]"></div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 font-medium tracking-wide">Top Authority</p>
                  <p className="font-bold text-xl text-slate-900 dark:text-white">BBMP</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary"></span>
                  <span className="font-medium">BBMP</span>
                </div>
                <span className="font-bold">42%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                  <span className="font-medium">BWSSB</span>
                </div>
                <span className="font-bold">28%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-accent-success"></span>
                  <span className="font-medium">BESCOM</span>
                </div>
                <span className="font-bold">18%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="font-medium">Other</span>
                </div>
                <span className="font-bold">12%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Complaints table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h4 className="font-bold text-lg">Ticket Queue</h4>
          <button className="text-primary text-sm font-semibold hover:underline">View All</button>
        </div>
        <div className="p-2 pt-4">
          <ComplaintsTable
            tickets={filtered}
            onSelect={setSelected}
          />
        </div>
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
