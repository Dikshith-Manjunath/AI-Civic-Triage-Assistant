'use client';

import { useState } from 'react';
import TicketDrawer, { type Ticket } from './TicketDrawer';

const URGENCY_BADGE: Record<string, string> = {
    critical: 'bg-red-50 text-red-700',
    high: 'bg-orange-50 text-orange-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
};

const STATUS_DOT: Record<string, string> = {
    open: 'bg-slate-400',
    in_progress: 'bg-blue-500',
    dispatched: 'bg-indigo-500',
    resolved: 'bg-green-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', dispatched: 'Dispatched',
    resolved: 'Resolved', approved: 'Approved', rejected: 'Rejected',
};

type Props = {
    initialTickets: Ticket[];
};

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
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                <input
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#1a2a47]/20 outline-none placeholder:text-slate-400"
                    placeholder="Search tickets by ID, category, status..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Title</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Urgency</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assignee</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(ticket => (
                                <tr
                                    key={ticket.id}
                                    onClick={() => setSelected(ticket)}
                                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                                >
                                    <td className="px-5 py-4 text-sm font-bold text-[#1a2a47] group-hover:text-blue-600 transition-colors">
                                        #{ticket.ticket_no}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                                        {ticket.category}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">
                                        {ticket.title}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${URGENCY_BADGE[ticket.urgency] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {ticket.urgency}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <span className={`size-2 rounded-full flex-shrink-0 ${STATUS_DOT[ticket.status] ?? 'bg-slate-400'}`} />
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
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                                        <span className="material-symbols-outlined text-3xl mb-2 block">search_off</span>
                                        No tickets match your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drawer */}
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
