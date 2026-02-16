"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardKPIs, DeptTrend } from "@/lib/types";
import { DEPT_CONFIG } from "@/lib/types";

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [trend, setTrend] = useState<DeptTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [kpiData, trendData] = await Promise.all([
          api.getKPIs(),
          api.getDepartmentTrend(),
        ]);
        setKpis(kpiData);
        setTrend(trendData);
      } catch (e) {
        console.error("Analytics load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Aggregate trend by department
  const deptTotals: Record<string, number> = {};
  trend.forEach((t) => {
    deptTotals[t.department] = (deptTotals[t.department] || 0) + t.count;
  });

  // Aggregate trend by date
  const dateTotals: Record<string, number> = {};
  (kpis?.daily_trend ?? []).forEach((d) => {
    dateTotals[d.date] = (dateTotals[d.date] || 0) + d.count;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-sm text-zinc-500">
          Complaint trends and departmental performance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Trend Chart (CSS-based) */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Daily Complaint Volume
          </h2>
          {Object.keys(dateTotals).length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No trend data available yet
            </p>
          ) : (
            <div className="flex items-end gap-1" style={{ height: "200px" }}>
              {Object.entries(dateTotals)
                .slice(-30)
                .map(([date, count]) => {
                  const max = Math.max(...Object.values(dateTotals), 1);
                  const pct = (count / max) * 100;
                  return (
                    <div
                      key={date}
                      className="group relative flex-1"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="absolute bottom-0 w-full rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                        style={{ height: `${pct}%`, minHeight: "4px" }}
                      />
                      <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block">
                        {date}: {count}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-zinc-400">
            Last 30 days — integrate Recharts for production
          </p>
        </div>

        {/* Department Breakdown */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Department Load (Trend Period)
          </h2>
          <div className="space-y-3">
            {Object.entries(deptTotals)
              .sort(([, a], [, b]) => b - a)
              .map(([dept, count]) => {
                const config = DEPT_CONFIG[dept as keyof typeof DEPT_CONFIG] || DEPT_CONFIG.general;
                const max = Math.max(...Object.values(deptTotals), 1);
                const pct = ((count / max) * 100).toFixed(0);
                return (
                  <div key={dept} className="flex items-center gap-3">
                    <span className="w-6 text-center text-lg">{config.icon}</span>
                    <span className="w-28 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {config.label}
                    </span>
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: config.color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right text-sm font-bold text-zinc-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                );
              })}
            {Object.keys(deptTotals).length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                No department data yet
              </p>
            )}
          </div>
        </div>

        {/* Urgency Pie (simplified) */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Urgency Breakdown
          </h2>
          <div className="flex items-center justify-center gap-8">
            {Object.entries(kpis?.urgency_distribution ?? {}).map(
              ([level, count]) => {
                const colors = ["#22c55e", "#eab308", "#ef4444"];
                const labels = ["Low", "Medium", "High"];
                const idx = parseInt(level);
                const total = kpis?.total_complaints || 1;
                const pct = ((count / total) * 100).toFixed(1);
                return (
                  <div key={level} className="text-center">
                    <div
                      className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: colors[idx] }}
                    >
                      <span className="text-lg font-bold">{pct}%</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {labels[idx]}
                    </p>
                    <p className="text-xs text-zinc-500">{count} tickets</p>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Quick Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {kpis?.total_complaints ?? 0}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Total Complaints
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {kpis?.open_complaints ?? 0}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Open Issues
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {kpis?.total_complaints
                  ? kpis.total_complaints - kpis.open_complaints
                  : 0}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Resolved
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {kpis?.urgency_distribution?.["2"] ?? 0}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                High Priority
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
