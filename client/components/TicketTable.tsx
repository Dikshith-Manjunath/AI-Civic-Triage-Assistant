'use client';

import { useState } from 'react';
import TicketDrawer, { type Ticket } from './TicketDrawer';

const URGENCY_BADGE: Record<string, string> = {
    critical: 'badge-high',
    high:     'badge-high',
    medium:   'badge-medium',
    low:      'badge-low',
};

const STATUS_BADGE: Record<string, string> = {
    open:        'badge-open',
    in_progress: 'badge-inprogress',
    dispatched:  'badge-dispatched',
    resolved:    'badge-resolved',
    approved:    'badge-approved',
    rejected:    'badge-rejected',
};

const STATUS_DOT: Record<string, string> = {
    open:        'bg-[#38BDF8]',
    in_progress: 'bg-[#FACC15]',
    dispatched:  'bg-[#818CF8]',
    resolved:    'bg-[#22C55E]',
    approved:    'bg-[#22C55E]',
    rejected:    'bg-[#F87171]',
};

const STATUS_LABEL: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', dispatched: 'Dispatched',
    resolved: 'Resolved', approved: 'Approved', rejected: 'Rejected',
};

type Props = { initialTickets: Ticket[] };

export default function TicketTable({ initialTickets }: Props) {
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
    const [selected, setSelected] = useState<Ticket | null>(null);
    const [search, setSearch] = useState('');

    const filtered = tickets.filter(t =>
        t.ticket_no.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.status ?? '').toLowerCase().includes(search.toLowerCase())
    );

    function handleUpdate(updated: Ticket) {
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelected(updated);
    }

    return (
        <>
            {/* Search bar */}
            <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 text-lg">search</span>
                <input
                    className="input-dark pl-11 py-2.5"
                    placeholder="Search by ID, category, status…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="rounded-xl border border-white/[0.07] overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/[0.06]" style={{ background: 'var(--bg-elevated)' }}>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ticket ID</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Title</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Urgency</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Assignee</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {filtered.map(ticket => (
                                <tr
                                    key={ticket.id}
                                    onClick={() => setSelected(ticket)}
                                    className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                                >
                                    <td className="px-5 py-4 text-sm font-bold text-[#38BDF8] group-hover:text-[#7DD3FC] transition-colors">
                                        #{ticket.ticket_no}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-300 whitespace-nowrap capitalize">
                                        {ticket.category}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">
                                        {ticket.title}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${URGENCY_BADGE[ticket.urgency] ?? 'badge-low'}`}>
                                            {ticket.urgency}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`flex items-center gap-2 text-xs font-semibold rounded-full px-2.5 py-1 w-fit ${STATUS_BADGE[ticket.status] ?? 'badge-open'}`}>
                                            <span className={`size-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[ticket.status] ?? 'bg-slate-400'}`} />
                                            {STATUS_LABEL[ticket.status] ?? ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">
                                        {ticket.assignee ?? '—'}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-14 text-center text-slate-600">
                                        <span className="material-symbols-outlined text-4xl mb-3 block text-slate-700">search_off</span>
                                        No tickets match your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selected && (
                <TicketDrawer
                    ticket={selected}
                    onClose={() => setSelected(null)}
                    onUpdate={handleUpdate}
                />
            )}
        </>
    );
}
