"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { UrgencyBadge, DeptBadge, StatusBadge } from "@/components/Badges";
import type { Ticket, Department, TicketStatus, UrgencyLevel } from "@/lib/types";
import { DEPT_CONFIG } from "@/lib/types";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterDept, setFilterDept] = useState<string>("");
  const [filterUrgency, setFilterUrgency] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const pageSize = 15;

  async function loadTickets() {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (filterDept) params.department = filterDept;
      if (filterUrgency) params.urgency = parseInt(filterUrgency);
      if (filterStatus) params.status = filterStatus;

      const data = await api.getTickets(params);
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [page, filterDept, filterUrgency, filterStatus]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Tickets
          </h1>
          <p className="text-sm text-zinc-500">{total} total complaints</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={filterDept}
          onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <option value="">All Departments</option>
          {Object.entries(DEPT_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>
              {val.icon} {val.label}
            </option>
          ))}
        </select>
        <select
          value={filterUrgency}
          onChange={(e) => { setFilterUrgency(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <option value="">All Urgency</option>
          <option value="0">🟢 Low</option>
          <option value="1">🟡 Medium</option>
          <option value="2">🔴 High</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <option value="">All Status</option>
          <option value="processing">Processing</option>
          <option value="triaged">Triaged</option>
          <option value="assigned">Assigned</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Summary
              </th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Department
              </th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Urgency
              </th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Channel
              </th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <td className="max-w-xs truncate px-4 py-3 font-medium text-zinc-900 dark:text-white">
                    {t.summary}
                  </td>
                  <td className="px-4 py-3">
                    <DeptBadge department={t.department} />
                  </td>
                  <td className="px-4 py-3">
                    <UrgencyBadge level={t.urgency} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{t.channel}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(t.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
