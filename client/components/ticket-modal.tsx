/* ──────────────────────────────────────────────
   CivicFlow — Ticket Detail Modal
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback } from "react";
import { X, CheckCircle2, XCircle, ArrowRight, FileText, Loader2 } from "lucide-react";
import type { Ticket, SimilarComplaint, TicketStatus } from "@/lib/types";
import { STATUS_META, URGENCY_META, DEPARTMENTS } from "@/lib/types";
import { StatusBadge, UrgencyBadge, DeptBadge } from "./badges";
import { approveTicket, rejectTicket, transitionTicket, fetchSimilar } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/** Which actions are allowed per status */
const ACTIONS: Record<string, { label: string; next: string; style: string; icon: React.ReactNode }[]> = {
  pending: [
    { label: "Send for Review", next: "awaiting_approval", style: "bg-black text-white", icon: <ArrowRight size={14} /> },
  ],
  awaiting_approval: [
    { label: "Approve",  next: "__approve__", style: "bg-emerald-600 text-white", icon: <CheckCircle2 size={14} /> },
    { label: "Reject",   next: "__reject__",  style: "bg-red-600 text-white",     icon: <XCircle size={14} /> },
  ],
  approved: [
    { label: "File Complaint", next: "filed", style: "bg-black text-white", icon: <FileText size={14} /> },
  ],
  filed: [
    { label: "Mark Resolved", next: "resolved", style: "bg-emerald-600 text-white", icon: <CheckCircle2 size={14} /> },
  ],
};

interface Props {
  ticket: Ticket;
  onClose: () => void;
  onUpdated: () => void;
}

export default function TicketModal({ ticket, onClose, onUpdated }: Props) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [similar, setSimilar] = useState<SimilarComplaint[]>([]);
  const [tab, setTab] = useState<"details" | "similar">("details");

  // Load similar on mount
  useEffect(() => {
    fetchSimilar(ticket.id)
      .then(setSimilar)
      .catch(() => setSimilar([]));
  }, [ticket.id]);

  // Escape to close
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAction = useCallback(
    async (next: string) => {
      if (!session) return;
      setLoading(true);
      setError("");
      try {
        if (next === "__approve__") {
          await approveTicket(ticket.id, session.name);
        } else if (next === "__reject__") {
          await rejectTicket(ticket.id, session.name);
        } else {
          await transitionTicket(ticket.id, next, session.name);
        }
        onUpdated();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setLoading(false);
      }
    },
    [session, ticket.id, onUpdated]
  );

  const actions = ACTIONS[ticket.status] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="animate-modal-in w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <p className="text-xs font-mono text-neutral-400">#{ticket.id.slice(0, 8)}</p>
            <h2 className="mt-1 text-lg font-semibold text-black">Complaint Details</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 px-6">
          {(["details", "similar"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-black text-black"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {t === "similar" ? `Similar (${similar.length})` : t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {tab === "details" ? (
            <>
              {/* Meta row */}
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={ticket.status as TicketStatus} />
                <UrgencyBadge urgency={ticket.urgency} />
                <DeptBadge dept={ticket.dept} />
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-mono text-neutral-500">
                  {ticket.authority}
                </span>
              </div>

              {/* Timestamp */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Submitted</p>
                <p className="text-sm text-neutral-600">
                  {new Date(ticket.timestamp).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>

              {/* Summary */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Summary</p>
                <p className="text-sm text-neutral-700 leading-relaxed">{ticket.summary}</p>
              </div>

              {/* AI Reply */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">AI Analysis</p>
                <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-3">
                  <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">{ticket.reply}</p>
                </div>
              </div>

              {/* Media placeholder */}
              {ticket.media && ticket.media.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Attachments
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ticket.media.map((m, i) =>
                      m.type === "image" ? (
                        <img
                          key={i}
                          src={m.url}
                          alt="Attachment"
                          className="rounded-lg border border-neutral-200 w-full h-32 object-cover"
                        />
                      ) : (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 text-xs text-neutral-500"
                        >
                          <FileText size={14} />
                          {m.type.toUpperCase()} file
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Similar complaints tab */
            <div className="space-y-2">
              {similar.length === 0 ? (
                <p className="text-sm text-neutral-400 py-8 text-center">No similar complaints found</p>
              ) : (
                similar.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-neutral-100 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-neutral-400">#{s.id.slice(0, 8)}</span>
                      <span className="text-[11px] text-neutral-400">
                        {(s.score * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700">{s.summary}</p>
                    <div className="flex gap-2 text-[11px] text-neutral-400">
                      <span>{s.dept}</span>
                      <span>&middot;</span>
                      <span>{s.authority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions footer */}
        {actions.length > 0 && tab === "details" && (
          <div className="border-t border-neutral-100 px-6 py-4">
            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}
            <div className="flex gap-2">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => handleAction(a.next)}
                  disabled={loading}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${a.style}`}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
