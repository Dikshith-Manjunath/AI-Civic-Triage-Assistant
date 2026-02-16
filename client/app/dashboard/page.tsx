"use client";

import { useEffect, useState } from "react";
import KPICard from "@/components/KPICard";
import { UrgencyBadge, DeptBadge, StatusBadge } from "@/components/Badges";
import { api } from "@/lib/api";
import type { DashboardKPIs, Ticket } from "@/lib/types";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [kpiData, ticketData] = await Promise.all([
          api.getKPIs(),
          api.getTickets({ page: 1, page_size: 5 }),
        ]);
        setKpis(kpiData);
        setRecentTickets(ticketData.tickets);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-400">
            ⚠️ Cannot connect to API: {error}
          </p>
          <p className="mt-2 text-sm text-red-600 dark:text-red-500">
            Make sure the FastAPI server is running on port 8000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500">
          Real-time civic complaint overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Complaints"
          value={kpis?.total_complaints ?? 0}
          icon="📋"
          color="blue"
        />
        <KPICard
          title="Open Issues"
          value={kpis?.open_complaints ?? 0}
          icon="🔴"
          color="red"
        />
        <KPICard
          title="Avg Resolution"
          value={`${(kpis?.avg_resolution_hours ?? 0).toFixed(1)}h`}
          icon="⏱️"
          color="green"
        />
        <KPICard
          title="High Urgency"
          value={kpis?.urgency_distribution?.["2"] ?? 0}
          icon="🚨"
          color="yellow"
        />
      </div>

      {/* Department & Urgency distributions */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Department Distribution */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            By Department
          </h2>
          <div className="space-y-3">
            {Object.entries(kpis?.department_distribution ?? {}).map(
              ([dept, count]) => {
                const total = kpis?.total_complaints || 1;
                const pct = ((count / total) * 100).toFixed(0);
                return (
                  <div key={dept} className="flex items-center gap-3">
                    <DeptBadge department={dept as any} />
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {count}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Urgency Distribution */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            By Urgency
          </h2>
          <div className="flex items-end gap-4">
            {Object.entries(kpis?.urgency_distribution ?? {}).map(
              ([level, count]) => {
                const total = kpis?.total_complaints || 1;
                const pct = (count / total) * 100;
                const colors = ["bg-green-500", "bg-yellow-500", "bg-red-500"];
                const labels = ["Low", "Medium", "High"];
                const idx = parseInt(level);
                return (
                  <div key={level} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">
                      {count}
                    </span>
                    <div className="w-full rounded-t-lg bg-zinc-100 dark:bg-zinc-800" style={{ height: "120px" }}>
                      <div
                        className={`w-full rounded-t-lg ${colors[idx] ?? "bg-gray-500"}`}
                        style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-zinc-500">
                      {labels[idx] ?? `Level ${level}`}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Recent Complaints
          </h2>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {recentTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {ticket.summary}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {new Date(ticket.timestamp).toLocaleString()} via{" "}
                  {ticket.channel}
                </p>
              </div>
              <DeptBadge department={ticket.department} />
              <UrgencyBadge level={ticket.urgency} />
              <StatusBadge status={ticket.status} />
            </div>
          ))}
          {recentTickets.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">
              No complaints yet. Submit one to get started!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
