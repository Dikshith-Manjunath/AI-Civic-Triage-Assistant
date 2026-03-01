'use client';

import React, { useState, useEffect, useRef } from 'react';

export type Ticket = {
    id: string | number;
    ticket_no: string;
    department: string;
    category: string;
    title: string;
    description: string | null;
    location: string | null;
    ward: string | null;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    assignee: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
};

type TicketEvent = {
    id: number;
    ticket_id: number;
    action: string;
    actor: string;
    note: string | null;
    created_at: string;
};

type MediaItem = {
    id: string;
    type: 'image' | 'audio' | 'pdf';
    filename: string;
    content_type: string;
    size_bytes: number;
    url: string | null;
};

type Props = {
    ticket: Ticket;
    onClose: () => void;
    onUpdate: (updated: Ticket) => void;
};

const URGENCY_STYLES: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_STYLES: Record<string, string> = {
    open: 'bg-slate-100 text-slate-700 border-slate-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    dispatched: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-600 border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', dispatched: 'Dispatched',
    resolved: 'Resolved', approved: 'Approved', rejected: 'Rejected',
};

const ACTION_ICON: Record<string, string> = {
    created: 'add', resolved: 'check_circle', approved: 'assignment_turned_in',
    rejected: 'close', assigned: 'person', dispatched: 'local_shipping',
    review: 'rate_review', reopen: 'refresh', comment: 'comment',
};

// Map client action → new local status (for optimistic UI update)
const ACTION_STATUS: Record<string, string> = {
    review: 'in_progress',
    approve: 'approved',
    reject: 'rejected',
    resolve: 'resolved',
    reopen: 'open',
};

export default function TicketDrawer({ ticket: initialTicket, onClose, onUpdate }: Props) {
    const [ticket, setTicket] = useState<Ticket>(initialTicket);
    const [events, setEvents] = useState<TicketEvent[]>([]);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTicket(initialTicket);
        // Fetch ticket details
        fetch(`/api/server-tickets/${initialTicket.id}`)
            .then(r => r.json())
            .then(data => {
                if (data.ticket) setTicket(data.ticket);
                if (data.events) setEvents(data.events);
                setLoading(false);
            });
        // Fetch media attachments
        fetch(`/api/server-tickets/${initialTicket.id}/media`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setMedia(data);
            })
            .catch(() => { });
    }, [initialTicket.id]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    async function doAction(action: string) {
        setActionLoading(action);
        setActionError(null);
        try {
            const res = await fetch(`/api/server-tickets/${ticket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, note: comment || null }),
            });
            const data = await res.json();

            if (!res.ok) {
                setActionError(data.error || `Failed to ${action} ticket`);
                setActionLoading(null);
                return;
            }

            if (data.ticket) {
                // Server returned the updated ticket
                setTicket(data.ticket);
                onUpdate(data.ticket);
                if (data.events) setEvents(data.events);
            } else {
                // Server action succeeded but no ticket returned — update locally
                const newStatus = ACTION_STATUS[action] || ticket.status;
                const updated = { ...ticket, status: newStatus, updated_at: new Date().toISOString() };
                setTicket(updated);
                onUpdate(updated);
            }
            setComment('');
        } catch (err: any) {
            setActionError(err?.message || 'Network error — please try again');
        }
        setActionLoading(null);
    }

    async function addComment() {
        if (!comment.trim()) return;
        setActionLoading('comment');
        const res = await fetch(`/api/server-tickets/${ticket.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'comment', note: comment }),
        });
        const data = await res.json();
        if (data.events) setEvents(data.events);
        setComment('');
        setActionLoading(null);
    }

    const isTerminal = ['resolved', 'rejected', 'approved'].includes(ticket.status);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="fixed top-0 right-0 h-full w-full max-w-[640px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
                style={{ animation: 'slideIn 0.2s ease-out' }}
            >
                <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

                {/* ── Header ───────────────────────────────── */}
                <div className="flex flex-col gap-4 p-6 border-b border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Ticket #{ticket.ticket_no}
                            </h1>
                            <p className="text-slate-500 mt-0.5 font-medium text-sm">
                                {ticket.category} — {ticket.title}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${URGENCY_STYLES[ticket.urgency]}`}>
                            <span className="material-symbols-outlined text-base">warning</span>
                            {ticket.urgency.charAt(0).toUpperCase() + ticket.urgency.slice(1)}
                        </span>
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_STYLES[ticket.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            <span className="material-symbols-outlined text-base">sync</span>
                            {STATUS_LABEL[ticket.status] ?? ticket.status}
                        </span>
                        {ticket.assignee && (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="material-symbols-outlined text-base">person</span>
                                {ticket.assignee}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Scrollable body ───────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-7">
                    {loading ? (
                        <div className="text-center py-16 text-slate-400">
                            <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                        </div>
                    ) : (
                        <>
                            {/* Complaint Summary */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Complaint Summary</h3>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-slate-700 leading-relaxed text-sm">
                                        {ticket.description || 'No description provided.'}
                                    </p>
                                </div>
                            </section>

                            {/* Media Attachments */}
                            {media.length > 0 && (
                                <section>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                        Attachments ({media.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Images */}
                                        {media.filter(m => m.type === 'image').map(m => (
                                            <div key={m.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                                {m.url ? (
                                                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={m.url}
                                                            alt={m.filename}
                                                            className="w-full max-h-80 object-contain bg-white"
                                                        />
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center justify-center h-32 text-slate-400">
                                                        <span className="material-symbols-outlined text-3xl">broken_image</span>
                                                    </div>
                                                )}
                                                <div className="px-3 py-2 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-200">
                                                    <span className="material-symbols-outlined text-sm">image</span>
                                                    <span className="truncate flex-1">{m.filename}</span>
                                                    <span>{(m.size_bytes / 1024).toFixed(0)} KB</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Audio */}
                                        {media.filter(m => m.type === 'audio').map(m => (
                                            <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                                                    <span className="material-symbols-outlined text-sm text-blue-500">audio_file</span>
                                                    <span className="truncate flex-1 font-medium">{m.filename}</span>
                                                    <span>{(m.size_bytes / 1024).toFixed(0)} KB</span>
                                                </div>
                                                {m.url ? (
                                                    <audio controls className="w-full" preload="metadata">
                                                        <source src={m.url} type={m.content_type} />
                                                        Your browser does not support audio playback.
                                                    </audio>
                                                ) : (
                                                    <p className="text-xs text-slate-400">Audio unavailable</p>
                                                )}
                                            </div>
                                        ))}

                                        {/* PDFs */}
                                        {media.filter(m => m.type === 'pdf').map(m => (
                                            <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                                                    <span className="material-symbols-outlined">picture_as_pdf</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">{m.filename}</p>
                                                    <p className="text-xs text-slate-400">{(m.size_bytes / 1024).toFixed(0)} KB</p>
                                                </div>
                                                {m.url && (
                                                    <a
                                                        href={m.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-xs font-semibold text-[#1a2a47] hover:underline"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                        View
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Location Details */}
                            <section className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Location Details</h3>
                                    {ticket.location && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Address</p>
                                            <p className="text-sm font-medium text-slate-800">{ticket.location}</p>
                                        </div>
                                    )}
                                    {ticket.ward && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Ward / Zone</p>
                                            <p className="text-sm font-medium text-slate-800">{ticket.ward}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Reported By</p>
                                        <p className="text-sm font-medium text-slate-800">{ticket.created_by || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Reported At</p>
                                        <p className="text-sm font-medium text-slate-800">
                                            {new Date(ticket.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-36 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-col gap-2 text-slate-400">
                                    <span className="material-symbols-outlined text-3xl">location_on</span>
                                    <span className="text-xs font-medium">{ticket.location ?? 'Location not specified'}</span>
                                </div>
                            </section>

                            {/* Timeline */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Timeline History</h3>
                                <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2.5 before:w-0.5 before:-translate-x-1/2 before:bg-slate-200">
                                    {[...events].reverse().map((ev, i) => (
                                        <div key={ev.id} className="relative flex items-start gap-4">
                                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-4 ring-white z-10 ${i === 0 ? 'bg-[#1a2a47]' : 'bg-slate-200'}`}>
                                                <span className={`material-symbols-outlined text-[11px] font-bold ${i === 0 ? 'text-white' : 'text-slate-500'}`}>
                                                    {ACTION_ICON[ev.action] ?? 'circle'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 capitalize">{ev.action.replace(/_/g, ' ')}</p>
                                                {ev.note && <p className="text-xs text-slate-600 mt-0.5">"{ev.note}"</p>}
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {new Date(ev.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} • by {ev.actor}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Internal Notes */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Internal Notes</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <input
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#1a2a47] focus:border-[#1a2a47] outline-none placeholder:text-slate-400"
                                            placeholder="Add a note or comment..."
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addComment()}
                                            disabled={actionLoading === 'comment'}
                                        />
                                    </div>
                                    <button
                                        onClick={addComment}
                                        disabled={!comment.trim() || actionLoading === 'comment'}
                                        className="bg-[#1a2a47]/10 text-[#1a2a47] p-2.5 rounded-lg hover:bg-[#1a2a47]/20 disabled:opacity-40 transition-colors"
                                    >
                                        <span className="material-symbols-outlined">send</span>
                                    </button>
                                </div>
                            </section>
                        </>
                    )}
                </div>

                {/* ── Error message ────────────────────────── */}
                {actionError && (
                    <div className="mx-5 mb-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 text-base">error</span>
                        <p className="text-sm text-red-700 flex-1">{actionError}</p>
                        <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                )}

                {/* ── Sticky Footer Actions ─────────────────── */}
                {!isTerminal && (
                    <div className="p-5 border-t border-slate-200 bg-slate-50/80 grid grid-cols-2 gap-3">
                        <button
                            onClick={() => doAction('reject')}
                            disabled={!!actionLoading}
                            className="flex items-center justify-center gap-2 bg-slate-200 text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-300 disabled:opacity-60 transition-colors"
                        >
                            {actionLoading === 'reject' ? (
                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">close_small</span>
                            )}
                            Reject
                        </button>
                        <button
                            onClick={() => doAction('resolve')}
                            disabled={!!actionLoading}
                            className="flex items-center justify-center gap-2 bg-[#1a2a47] text-white font-bold py-3 rounded-xl hover:bg-[#243761] disabled:opacity-60 transition-colors shadow-lg shadow-[#1a2a47]/20"
                        >
                            {actionLoading === 'resolve' ? (
                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                            )}
                            Resolve
                        </button>
                        <button
                            onClick={() => doAction('approve')}
                            disabled={!!actionLoading}
                            className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-white disabled:opacity-60 transition-colors"
                        >
                            {actionLoading === 'approve' ? (
                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                            )}
                            Approve
                        </button>
                        <button
                            onClick={() => doAction('review')}
                            disabled={!!actionLoading}
                            className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-white disabled:opacity-60 transition-colors"
                        >
                            {actionLoading === 'review' ? (
                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">rate_review</span>
                            )}
                            Review
                        </button>
                    </div>
                )}

                {isTerminal && (
                    <div className="p-5 border-t border-slate-200 bg-slate-50/80">
                        <button
                            onClick={() => doAction('reopen')}
                            disabled={!!actionLoading}
                            className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-white disabled:opacity-60 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">refresh</span>
                            Reopen Ticket
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
