/* ──────────────────────────────────────────────
   CivicFlow — Analytics Page  (Recharts)
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { fetchComplaints } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Ticket, TicketStatus, Department } from "@/lib/types";
import { DEPARTMENTS, DEPT_LIST, STATUS_META } from "@/lib/types";

/* ── Chart color palette (grayscale + accents) ── */
const COLORS = ["#000000", "#404040", "#737373", "#a3a3a3", "#d4d4d4", "#e5e5e5", "#f5f5f5"];
const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: "#a3a3a3",
  awaiting_approval: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
  filed: "#3b82f6",
  resolved: "#065f46",
};

export default function AnalyticsPage() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints(500)
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter for officers
  const data = useMemo(() => {
    if (session?.role === "officer") return tickets.filter((t) => t.dept === session.department);
    return tickets;
  }, [tickets, session]);

  /* ── Chart datasets ── */

  // 1. Complaints by department
  const byDept = useMemo(
    () =>
      DEPT_LIST.map((d) => ({
        name: DEPARTMENTS[d].split(" ")[0],     // short label
        dept: d,
        count: data.filter((t) => t.dept === d).length,
      })).filter((d) => d.count > 0),
    [data]
  );

  // 2. Status distribution (pie)
  const byStatus = useMemo(
    () =>
      (Object.keys(STATUS_META) as TicketStatus[])
        .map((s) => ({
          name: STATUS_META[s].label,
          value: data.filter((t) => t.status === s).length,
          status: s,
        }))
        .filter((d) => d.value > 0),
    [data]
  );

  // 3. Urgency distribution
  const byUrgency = useMemo(
    () => [
      { name: "Low",    count: data.filter((t) => t.urgency === 0).length },
      { name: "Medium", count: data.filter((t) => t.urgency === 1).length },
      { name: "High",   count: data.filter((t) => t.urgency === 2).length },
    ],
    [data]
  );

  // 4. Authority distribution
  const byAuthority = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of data) counts[t.authority] = (counts[t.authority] ?? 0) + 1;
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // 5. Daily trend (last 14 days)
  const dailyTrend = useMemo(() => {
    const dayMap: Record<string, number> = {};
    for (const t of data) {
      try {
        const day = new Date(t.timestamp).toISOString().slice(0, 10);
        dayMap[day] = (dayMap[day] ?? 0) + 1;
      } catch { /* skip bad timestamps */ }
    }
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        complaints: count,
      }));
  }, [data]);

  // 6. Resolution rate by department
  const resolutionRate = useMemo(
    () =>
      DEPT_LIST.map((d) => {
        const deptTickets = data.filter((t) => t.dept === d);
        const total = deptTickets.length;
        const resolved = deptTickets.filter((t) => t.status === "resolved").length;
        return {
          name: DEPARTMENTS[d].split(" ")[0],
          rate: total ? Math.round((resolved / total) * 100) : 0,
          total,
        };
      }).filter((d) => d.total > 0),
    [data]
  );

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
        <h1 className="text-xl font-semibold text-black">Analytics</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Insights across {data.length} complaints
        </p>
      </div>

      {/* Row 1: Trend + Status pie */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily trend (2/3 width) */}
        <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Daily Complaint Volume
          </h2>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#999" }} />
                <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="complaints"
                  stroke="#000"
                  strokeWidth={2}
                  dot={{ fill: "#000", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-neutral-400">No trend data available</p>
          )}
        </div>

        {/* Status pie (1/3 width) */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Status Distribution
          </h2>
          {byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {byStatus.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-neutral-400">No data</p>
          )}
        </div>
      </div>

      {/* Row 2: By department + urgency */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Department workload */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Complaints by Department
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDept} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#666" }} width={80} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="#000" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Urgency */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Urgency Distribution
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byUrgency}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666" }} />
              <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                <Cell fill="#a3a3a3" />
                <Cell fill="#525252" />
                <Cell fill="#000000" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Authority + resolution rate */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Authority */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Routing by Authority
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byAuthority}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#666" }} />
              <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="#404040" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution rate */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Resolution Rate by Department
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={resolutionRate}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#999" }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [`${value}%`, "Resolved"]}
              />
              <Bar dataKey="rate" fill="#000" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
