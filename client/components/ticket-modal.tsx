/* ──────────────────────────────────────────────
   CivicFlow — Ticket Detail Modal
   ────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback } from "react";
import type { Ticket, SimilarComplaint, TicketStatus, Department } from "@/lib/types";
import { STATUS_META, URGENCY_META, DEPARTMENTS } from "@/lib/types";
import { StatusBadge, UrgencyBadge, DeptBadge } from "./badges";
import { approveTicket, rejectTicket, transitionTicket, fetchSimilar } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface ActionDef {
  label: string;
  next: string;
  style: string;
  icon: string;
}

/** Which actions are allowed per status */
const ACTIONS: Record<string, ActionDef[]> = {
  pending: [
    { label: "Send for Review", next: "awaiting_approval", style: "bg-primary text-white hover:bg-primary/90", icon: "send" },
  ],
  awaiting_approval: [
    { label: "Approve Ticket", next: "__approve__", style: "bg-accent-success text-white hover:bg-emerald-700", icon: "check_circle" },
    { label: "Reject Ticket", next: "__reject__", style: "bg-accent-danger text-white hover:bg-red-700", icon: "cancel" },
  ],
  approved: [
    { label: "File Complaint", next: "filed", style: "bg-primary text-white hover:bg-primary/90", icon: "file_copy" },
  ],
  filed: [
    { label: "Mark Resolved", next: "resolved", style: "bg-accent-success text-white hover:bg-emerald-700", icon: "task_alt" },
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load similar on mount
  useEffect(() => {
    fetchSimilar(ticket.id)
      .then(setSimilar)
      .catch(() => setSimilar([]));
  }, [ticket.id]);

  // Escape to close
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedImage) {
          setSelectedImage(null);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, selectedImage]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 shadow-2xl transition-all" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-primary text-xl">confirmation_number</span>
              <p className="text-sm font-mono font-bold text-slate-500 uppercase tracking-widest">Ticket #{ticket.id.slice(0, 8)}</p>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Complaint Information</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
          {(["details", "similar"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative flex items-center gap-2 ${tab === t
                ? "text-primary"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {t === "details" ? "info" : "content_copy"}
              </span>
              {t === "similar" ? `Similar Cases (${similar.length})` : "Case Details"}
              {tab === t && (
                <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white dark:bg-slate-900">
          {tab === "details" ? (
            <>
              {/* Meta row */}
              <div className="flex flex-wrap gap-3">
                <StatusBadge status={ticket.status as TicketStatus} />
                <UrgencyBadge urgency={ticket.urgency} />
                <DeptBadge dept={ticket.dept} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 font-mono text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined text-[14px]">shield_person</span>
                  {ticket.authority}
                </span>
              </div>

              {/* Timestamp & Reporter Block */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">calendar_clock</span> Time Logged
                  </p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(ticket.timestamp).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">source</span> Channel
                  </p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Citizen Portal App
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">description</span> Issue Description
                </h3>
                <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {ticket.summary}
                </p>
              </div>

              {/* AI Reply */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-purple-500 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">robot_2</span> AI Analysis & Action Plan
                </h3>
                <div className="rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/50 dark:bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <p className="text-sm text-purple-900 dark:text-purple-200 leading-relaxed whitespace-pre-wrap relative z-10 font-medium">
                    {ticket.reply}
                  </p>
                </div>
              </div>

              {/* Enhanced Media Rendering Section */}
              {ticket.media && ticket.media.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">perm_media</span> Attached Evidence
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ticket.media.map((m, i) => {
                      // Render Image
                      if (m.type === "image") {
                        return (
                          <div
                            key={i}
                            className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800 aspect-video cursor-pointer"
                            onClick={() => setSelectedImage(m.url)}
                          >
                            <img
                              src={m.url}
                              alt="Complaint Evidence"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                              <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full backdrop-blur-sm shadow-xl">zoom_in</span>
                            </div>
                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-mono font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">image</span> IMG_{i + 1}
                            </div>
                          </div>
                        );
                      }

                      // Render Audio
                      if (m.type === "audio") {
                        return (
                          <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex flex-col justify-center items-center gap-3">
                            <span className="material-symbols-outlined text-3xl text-slate-400">mic</span>
                            <div className="w-full bg-white dark:bg-slate-900 rounded-lg p-1 shadow-inner border border-slate-200 dark:border-slate-700">
                              <audio controls src={m.url} className="w-full h-10 outline-none" preload="metadata">
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Audio Evidence</span>
                          </div>
                        );
                      }

                      // Render PDF or Document
                      if (m.type === "pdf" || m.url.endsWith('.pdf')) {
                        return (
                          <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden flex flex-col h-full min-h-[220px]">
                            <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                              <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">Document_{i + 1}.pdf</span>
                              <a href={m.url} target="_blank" rel="noreferrer" className="ml-auto flex items-center justify-center p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 transition-colors group">
                                <span className="material-symbols-outlined text-[16px] group-hover:text-primary">open_in_new</span>
                              </a>
                            </div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 relative group overflow-hidden">
                              <iframe src={`${m.url}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full min-h-[180px] border-none pointer-events-none opacity-80" />
                              <a href={m.url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/10 transition-colors">
                                <span className="px-4 py-2 bg-white dark:bg-slate-900 text-sm font-bold text-primary dark:text-blue-400 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                  Open PDF
                                </span>
                              </a>
                            </div>
                          </div>
                        );
                      }

                      // Fallback for unknown media types
                      return (
                        <a
                          key={i}
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <span className="material-symbols-outlined text-2xl text-slate-400">draft</span>
                          <span className="flex-1 text-left line-clamp-1">{String(m.type ?? "UNKNOWN").toUpperCase()} File attached</span>
                          <span className="material-symbols-outlined text-[16px]">download</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Similar complaints tab */
            <div className="space-y-4">
              {similar.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-slate-400">format_list_bulleted</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Similar Cases</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">This appears to be a unique complaint without recent identical reports.</p>
                  </div>
                </div>
              ) : (
                similar.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow cursor-default"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-outlined text-[14px]">tag</span> {s.id.slice(0, 8)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <span className="material-symbols-outlined text-[12px]">analytics</span>
                        {(s.score * 100).toFixed(0)}% Match
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{s.summary}</p>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">{DEPARTMENTS[s.dept as Department] || s.dept}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">{s.authority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions footer */}
        {actions.length > 0 && tab === "details" && (
          <div className="bg-slate-50 dark:bg-slate-800/80 px-8 py-6 border-t border-slate-200 dark:border-slate-800">
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-3 text-red-700">
                <span className="material-symbols-outlined shrink-0">error</span>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
              {actions.map((a: ActionDef) => (
                <button
                  key={a.label}
                  onClick={() => handleAction(a.next)}
                  disabled={loading}
                  className={`flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${a.style}`}
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">{a.icon}</span>
                  )}
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[70]"
            aria-label="Close full screen image"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          {selectedImage && ( // Guard rendering of img src
            <img
              src={selectedImage}
              alt="Fullscreen Evidence"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
