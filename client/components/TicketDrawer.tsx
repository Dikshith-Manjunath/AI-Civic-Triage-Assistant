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
    critical: 'badge-high',
    high:     'badge-high',
    medium:   'badge-medium',
    low:      'badge-low',
};

const STATUS_STYLES: Record<string, string> = {
    open:        'badge-open',
    in_progress: 'badge-inprogress',
    dispatched:  'badge-dispatched',
    resolved:    'badge-resolved',
    approved:    'badge-approved',
    rejected:    'badge-rejected',
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

const ACTION_STATUS: Record<string, string> = {
    review: 'in_progress', approve: 'approved', reject: 'rejected',
    resolve: 'resolved', reopen: 'open',
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
        fetch(`/api/server-tickets/${initialTicket.id}`)
            .then(r => r.json())
            .then(data => {
                if (data.ticket) setTicket(data.ticket);
                if (data.events) setEvents(data.events);
                setLoading(false);
            });
        fetch(`/api/server-tickets/${initialTicket.id}/media`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setMedia(data); })
            .catch(() => { });
    }, [initialTicket.id]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

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
                setTicket(data.ticket);
                onUpdate(data.ticket);
                if (data.events) setEvents(data.events);
            } else {
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="fixed top-0 right-0 h-full w-full max-w-[640px] z-50 flex flex-col border-l border-white/[0.07] shadow-[−32px_0_64px_rgba(0,0,0,0.6)]"
                style={{ background: 'var(--bg-surface)', animation: 'slideIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}
            >
                <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

                {/* ── Header ── */}
                <div className="flex flex-col gap-4 p-6 border-b border-white/[0.06]">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="font-display text-2xl font-700 text-white">
                                Ticket #{ticket.ticket_no}
                            </h1>
                            <p className="text-slate-500 mt-0.5 text-sm capitalize">
                                {ticket.category} — {ticket.title}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/[0.06] rounded-full transition-colors text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${URGENCY_STYLES[ticket.urgency] ?? 'badge-low'}`}>
                            <span className="material-symbols-outlined text-sm">warning</span>
                            {ticket.urgency}
                        </span>
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[ticket.status] ?? 'badge-open'}`}>
                            <span className="material-symbols-outlined text-sm">sync</span>
                            {STATUS_LABEL[ticket.status] ?? ticket.status}
                        </span>
                        {ticket.assignee && (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-slate-400 border border-white/[0.06]">
                                <span className="material-symbols-outlined text-sm">person</span>
                                {ticket.assignee}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-7">
                    {loading ? (
                        <div className="text-center py-16 text-slate-600">
                            <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                        </div>
                    ) : (
                        <>
                            {/* Complaint Summary */}
                            <section>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Complaint Summary</h3>
                                <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'var(--bg-elevated)' }}>
                                    <p className="text-slate-300 leading-relaxed text-sm">
                                        {ticket.description || 'No description provided.'}
                                    </p>
                                </div>
                            </section>

                            {/* Media Attachments */}
                            {media.length > 0 && (
                                <section>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                                        Attachments ({media.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {media.filter(m => m.type === 'image').map(m => (
                                            <div key={m.id} className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                                                {m.url ? (
                                                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={m.url} alt={m.filename} className="w-full max-h-80 object-contain" />
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center justify-center h-32 text-slate-600">
                                                        <span className="material-symbols-outlined text-3xl">broken_image</span>
                                                    </div>
                                                )}
                                                <div className="px-3 py-2 flex items-center gap-2 text-xs text-slate-500 border-t border-white/[0.06]">
                                                    <span className="material-symbols-outlined text-sm">image</span>
                                                    <span className="truncate flex-1">{m.filename}</span>
                                                    <span>{(m.size_bytes / 1024).toFixed(0)} KB</span>
                                                </div>
                                            </div>
                                        ))}
                                        {media.filter(m => m.type === 'audio').map(m => (
                                            <div key={m.id} className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'var(--bg-elevated)' }}>
                                                <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                                                    <span className="material-symbols-outlined text-sm text-[#38BDF8]">audio_file</span>
                                                    <span className="truncate flex-1 font-medium text-slate-300">{m.filename}</span>
                                                    <span>{(m.size_bytes / 1024).toFixed(0)} KB</span>
                                                </div>
                                                {m.url ? (
                                                    <audio controls className="w-full" preload="metadata">
                                                        <source src={m.url} type={m.content_type} />
                                                    </audio>
                                                ) : (
                                                    <p className="text-xs text-slate-600">Audio unavailable</p>
                                                )}
                                            </div>
                                        ))}
                                        {media.filter(m => m.type === 'pdf').map(m => (
                                            <div key={m.id} className="rounded-xl border border-white/[0.06] p-4 flex items-center gap-3" style={{ background: 'var(--bg-elevated)' }}>
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                                                    <span className="material-symbols-outlined text-red-400">picture_as_pdf</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-200 truncate">{m.filename}</p>
                                                    <p className="text-xs text-slate-500">{(m.size_bytes / 1024).toFixed(0)} KB</p>
                                                </div>
                                                {m.url && (
                                                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-[#38BDF8] hover:text-[#7DD3FC] cursor-pointer">
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
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Location Details</h3>
                                    {ticket.location && (
                                        <div>
                                            <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wider">Address</p>
                                            <p className="text-sm font-medium text-slate-300">{ticket.location}</p>
                                        </div>
                                    )}
                                    {ticket.ward && (
                                        <div>
                                            <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wider">Ward / Zone</p>
                                            <p className="text-sm font-medium text-slate-300">{ticket.ward}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wider">Reported By</p>
                                        <p className="text-sm font-medium text-slate-300">{ticket.created_by || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wider">Reported At</p>
                                        <p className="text-sm font-medium text-slate-300">
                                            {new Date(ticket.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-36 rounded-xl border border-white/[0.06] flex items-center justify-center flex-col gap-2 text-slate-600" style={{ background: 'var(--bg-elevated)' }}>
                                    <span className="material-symbols-outlined text-3xl text-slate-700">location_on</span>
                                    <span className="text-xs font-medium text-center px-2">{ticket.location ?? 'Location not specified'}</span>
                                </div>
                            </section>

                            {/* Timeline */}
                            <section>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Timeline History</h3>
                                <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2.5 before:w-0.5 before:-translate-x-1/2 before:bg-white/[0.06]">
                                    {[...events].reverse().map((ev, i) => (
                                        <div key={ev.id} className="relative flex items-start gap-4">
                                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-4 z-10 ${i === 0 ? 'bg-[#38BDF8] ring-[#020617]' : 'bg-[#1E293B] ring-[#020617]'}`}>
                                                <span className={`material-symbols-outlined text-[10px] font-bold ${i === 0 ? 'text-[#020617]' : 'text-slate-500'}`}>
                                                    {ACTION_ICON[ev.action] ?? 'circle'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200 capitalize">{ev.action.replace(/_/g, ' ')}</p>
                                                {ev.note && <p className="text-xs text-slate-400 mt-0.5">&quot;{ev.note}&quot;</p>}
                                                <p className="text-xs text-slate-600 mt-1">
                                                    {new Date(ev.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} • by {ev.actor}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Internal Notes */}
                            <section>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Internal Notes</h3>
                                <div className="flex items-center gap-3">
                                    <input
                                        className="input-dark flex-1"
                                        placeholder="Add a note or comment…"
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addComment()}
                                        disabled={actionLoading === 'comment'}
                                    />
                                    <button
                                        onClick={addComment}
                                        disabled={!comment.trim() || actionLoading === 'comment'}
                                        className="flex items-center justify-center p-2.5 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] hover:bg-[#38BDF8]/25 disabled:opacity-40 transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined">send</span>
                                    </button>
                                </div>
                            </section>
                        </>
                    )}
                </div>

                {/* Error message */}
                {actionError && (
                    <div className="mx-5 mb-2 border border-red-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.08)' }}>
                        <span className="material-symbols-outlined text-red-400 text-base">error</span>
                        <p className="text-sm text-red-300 flex-1">{actionError}</p>
                        <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-200 cursor-pointer">
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                )}

                {/* Sticky Footer Actions */}
                {!isTerminal && (
                    <div className="p-5 border-t border-white/[0.06] grid grid-cols-2 gap-3" style={{ background: 'var(--bg-elevated)' }}>
                        <button
                            onClick={() => doAction('reject')}
                            disabled={!!actionLoading}
                            className="flex items-center justify-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 font-bold py-3 rounded-xl hover:bg-red-500/20 disabled:opacity-60 transition-colors cursor-pointer"
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
                            className="btn-accent flex items-center justify-center gap-2 py-3 rounded-xl disabled:opacity-60"
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
                            className="flex items-center justify-center gap-2 border border-white/[0.08] text-slate-300 font-bold py-3 rounded-xl hover:bg-white/[0.05] disabled:opacity-60 transition-colors cursor-pointer"
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
                            className="flex items-center justify-center gap-2 border border-white/[0.08] text-slate-300 font-bold py-3 rounded-xl hover:bg-white/[0.05] disabled:opacity-60 transition-colors cursor-pointer"
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
                    <div className="p-5 border-t border-white/[0.06]" style={{ background: 'var(--bg-elevated)' }}>
                        <button
                            onClick={() => doAction('reopen')}
                            disabled={!!actionLoading}
                            className="w-full flex items-center justify-center gap-2 border border-white/[0.08] text-slate-400 font-bold py-3 rounded-xl hover:bg-white/[0.05] disabled:opacity-60 transition-colors cursor-pointer"
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
