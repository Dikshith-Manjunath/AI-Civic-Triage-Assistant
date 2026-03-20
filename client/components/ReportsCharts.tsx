'use client';

import { useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/* ── Types ── */
type Ticket = {
    id: string | number;
    ticket_no: string;
    department: string;
    category: string;
    title: string;
    urgency: string;
    status: string;
    created_at: string;
    assignee: string | null;
    created_by: string | null;
};

type Props = { tickets: Ticket[]; dept: string; deptLabel: string };

/* ── Palette ── */
const CHART_COLORS = ['#38BDF8', '#818CF8', '#FACC15', '#F87171', '#22C55E', '#F97316', '#A78BFA', '#FB7185'];
const STATUS_COLORS: Record<string, string> = {
    open: '#38BDF8', in_progress: '#FACC15', dispatched: '#818CF8',
    resolved: '#22C55E', approved: '#22C55E', rejected: '#F87171',
};
const URGENCY_COLORS: Record<string, string> = {
    low: '#94A3B8', medium: '#FACC15', high: '#F87171', critical: '#EF4444',
};

const tooltipStyle = {
    contentStyle: { background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', fontSize: '12px' },
    labelStyle: { color: '#94A3B8', fontWeight: 600, fontSize: '11px' },
    itemStyle: { color: '#F8FAFC' },
};

/* ── Component ── */
export default function ReportsCharts({ tickets, dept, deptLabel }: Props) {
    /* 1️⃣ Ticket Trend (area) — bucket by date */
    const trendData = useMemo(() => {
        const buckets: Record<string, number> = {};
        tickets.forEach(t => {
            const d = t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Unknown';
            buckets[d] = (buckets[d] || 0) + 1;
        });
        return Object.entries(buckets).map(([date, count]) => ({ date, count }));
    }, [tickets]);

    /* 2️⃣ Status distribution (donut) */
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
    }, [tickets]);

    /* 3️⃣ Urgency breakdown (stacked bar per category) */
    const urgencyByCat = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        tickets.forEach(t => {
            const cat = t.category || 'Other';
            if (!map[cat]) map[cat] = {};
            map[cat][t.urgency] = (map[cat][t.urgency] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => {
            const sumA = Object.values(a[1]).reduce((s, v) => s + v, 0);
            const sumB = Object.values(b[1]).reduce((s, v) => s + v, 0);
            return sumB - sumA;
        }).slice(0, 8).map(([cat, urgencies]) => ({ category: cat.length > 14 ? cat.slice(0, 14) + '…' : cat, ...urgencies }));
    }, [tickets]);

    /* 4️⃣ Source vs Status (grouped bar) */
    const sourceData = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        tickets.forEach(t => {
            const src = t.created_by || 'Unknown';
            if (!map[src]) map[src] = {};
            map[src][t.status] = (map[src][t.status] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => {
            const sumA = Object.values(a[1]).reduce((s, v) => s + v, 0);
            const sumB = Object.values(b[1]).reduce((s, v) => s + v, 0);
            return sumB - sumA;
        }).slice(0, 6).map(([source, statuses]) => ({ source: source.length > 12 ? source.slice(0, 12) + '…' : source, ...statuses }));
    }, [tickets]);

    /* 5️⃣ Category distribution (horizontal bar) */
    const catData = useMemo(() => {
        const counts: Record<string, number> = {};
        tickets.forEach(t => { counts[t.category || 'Other'] = (counts[t.category || 'Other'] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, count: value }));
    }, [tickets]);

    const allStatuses = useMemo(() => [...new Set(tickets.map(t => t.status))], [tickets]);
    const allUrgencies = useMemo(() => [...new Set(tickets.map(t => t.urgency))], [tickets]);

    /* ── KPI summary ── */
    const totalTickets = tickets.length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
    const avgResolution = totalTickets > 0 ? ((resolvedCount / totalTickets) * 100).toFixed(1) : '0';
    const highUrgency = tickets.filter(t => t.urgency === 'high' || t.urgency === 'critical').length;

    const kpis = [
        { label: 'Total Tickets', value: totalTickets, icon: 'receipt_long', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
        { label: 'Resolution Rate', value: `${avgResolution}%`, icon: 'check_circle', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
        { label: 'High/Critical', value: highUrgency, icon: 'priority_high', color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
        { label: 'Active Sources', value: new Set(tickets.map(t => t.created_by)).size, icon: 'source', color: '#818CF8', bg: 'rgba(129,140,248,0.1)' },
    ];

    return (
        <div className="space-y-8">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(k => (
                    <div key={k.label} className="rounded-2xl border border-white/[0.07] p-5" style={{ background: 'var(--bg-surface)' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: k.bg }}>
                                <span className="material-symbols-outlined text-lg" style={{ color: k.color, fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{k.label}</p>
                        <p className="font-display text-2xl font-800 mt-1" style={{ color: k.color }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Row 1: Trend + Status Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ticket Trend */}
                <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                    <h3 className="font-bold text-white mb-1">Ticket Intake Trend</h3>
                    <p className="text-xs text-slate-500 mb-5">Volume of incoming tickets over time</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                <Tooltip {...tooltipStyle} />
                                <Area type="monotone" dataKey="count" stroke="#38BDF8" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: '#38BDF8', r: 3 }} activeDot={{ r: 5, stroke: '#020617', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Donut */}
                <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                    <h3 className="font-bold text-white mb-1">Status Overview</h3>
                    <p className="text-xs text-slate-500 mb-5">Current ticket status distribution</p>
                    <div className="h-56 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                    {statusData.map((entry, i) => (
                                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name.replace(/ /g, '_')] || CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip {...tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {statusData.map((entry, i) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.name.replace(/ /g, '_')] || CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className="text-[11px] text-slate-400 capitalize truncate">{entry.name}</span>
                                <span className="text-[11px] text-slate-600 ml-auto font-semibold">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 2: Urgency Stacked + Source Grouped */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Urgency by Category (stacked bar — mirrors dept_urgency_stacked_graph.py) */}
                <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                    <h3 className="font-bold text-white mb-1">Urgency Mix by Category</h3>
                    <p className="text-xs text-slate-500 mb-5">Ticket urgency breakdown per complaint category</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={urgencyByCat} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="category" tick={{ fill: '#475569', fontSize: 10 }} angle={-25} textAnchor="end" axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                <Tooltip {...tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                                {allUrgencies.map((urg, i) => (
                                    <Bar key={urg} dataKey={urg} stackId="a" fill={URGENCY_COLORS[urg] || CHART_COLORS[i % CHART_COLORS.length]} radius={i === allUrgencies.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Source vs Status (grouped bar — mirrors source_status_grouped_graph.py) */}
                <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                    <h3 className="font-bold text-white mb-1">Source × Status Distribution</h3>
                    <p className="text-xs text-slate-500 mb-5">How different channels compare across status</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sourceData} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="source" tick={{ fill: '#475569', fontSize: 10 }} angle={-25} textAnchor="end" axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                <Tooltip {...tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                                {allStatuses.map((st, i) => (
                                    <Bar key={st} dataKey={st} fill={STATUS_COLORS[st] || CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 3: Category Volume (horizontal bar) */}
            <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                <h3 className="font-bold text-white mb-1">Category Volume</h3>
                <p className="text-xs text-slate-500 mb-5">Most frequent complaint categories</p>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                            <YAxis dataKey="name" type="category" tick={{ fill: '#94A3B8', fontSize: 11 }} width={120} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                {catData.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
