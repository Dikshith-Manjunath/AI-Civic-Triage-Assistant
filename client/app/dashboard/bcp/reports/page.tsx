'use client';

import { useMemo, useState, useEffect } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = ['#38BDF8', '#818CF8', '#FACC15', '#F87171', '#22C55E', '#F97316', '#A78BFA', '#FB7185'];
const STATUS_COLORS: Record<string, string> = {
    open: '#38BDF8', in_progress: '#FACC15', dispatched: '#818CF8',
    resolved: '#22C55E', approved: '#22C55E', rejected: '#F87171',
};

const tooltipStyle = {
    contentStyle: { background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', fontSize: '12px' },
    labelStyle: { color: '#94A3B8', fontWeight: 600, fontSize: '11px' },
    itemStyle: { color: '#F8FAFC' },
};

type Ticket = {
    id: string;
    category: string;
    urgency: string;
    status: string;
    created_at: string;
    created_by: string | null;
};

const URGENCY_MAP: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' };
const STATUS_MAP: Record<string, string> = {
    pending: 'open', awaiting_approval: 'in_progress', approved: 'approved',
    rejected: 'rejected', filed: 'dispatched', resolved: 'resolved',
};

export default function BCPReports() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        fetch(`${API_URL}/api/complaints/by-dept/bcp?limit=500`)
            .then(r => r.json())
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                setTickets(arr.map((t: any) => ({
                    id: t.id,
                    category: t.dept || 'general',
                    urgency: URGENCY_MAP[t.urgency] ?? 'medium',
                    status: STATUS_MAP[t.status] || t.status || 'open',
                    created_at: t.timestamp || new Date().toISOString(),
                    created_by: t.channel || 'web',
                })));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    /* Chart data */
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
    }, [tickets]);

    const trendData = useMemo(() => {
        const buckets: Record<string, number> = {};
        tickets.forEach(t => {
            const d = t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Unknown';
            buckets[d] = (buckets[d] || 0) + 1;
        });
        return Object.entries(buckets).map(([date, count]) => ({ date, count }));
    }, [tickets]);

    const catData = useMemo(() => {
        const counts: Record<string, number> = {};
        tickets.forEach(t => { counts[t.category || 'Other'] = (counts[t.category || 'Other'] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            count: value,
        }));
    }, [tickets]);

    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    const critical = tickets.filter(t => t.urgency === 'high').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <span className="material-symbols-outlined text-4xl text-[#38BDF8] animate-spin">progress_activity</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="font-display text-2xl font-800 text-white">Analytics &amp; Reports</h2>
                <p className="text-sm text-slate-500 mt-1">Incident statistics and performance metrics for BCP</p>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Incidents', value: total, icon: 'receipt_long', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
                    { label: 'Resolved', value: resolved, icon: 'check_circle', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
                    { label: 'High Urgency', value: critical, icon: 'priority_high', color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
                ].map(k => (
                    <div key={k.label} className="rounded-2xl border border-white/[0.07] p-5" style={{ background: 'var(--bg-surface)' }}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: k.bg }}>
                            <span className="material-symbols-outlined text-lg" style={{ color: k.color, fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{k.label}</p>
                        <p className="font-display text-2xl font-800 mt-1" style={{ color: k.color }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend */}
                <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                    <h4 className="font-bold text-white mb-1">Incident Trends</h4>
                    <p className="text-xs text-slate-500 mb-5">Incoming incident volume over time</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="bcpGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                                <Tooltip {...tooltipStyle} />
                                <Area type="monotone" dataKey="count" stroke="#38BDF8" strokeWidth={2.5} fill="url(#bcpGrad)" dot={{ fill: '#38BDF8', r: 3 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown Donut */}
                <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                    <h4 className="font-bold text-white mb-1">Category Breakdown</h4>
                    <p className="text-xs text-slate-500 mb-5">Incident types distribution</p>
                    <div className="h-48 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="count" strokeWidth={0}>
                                    {catData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip {...tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {catData.map((entry, i) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className="text-[11px] text-slate-400 truncate">{entry.name}</span>
                                <span className="text-[11px] text-slate-600 ml-auto font-semibold">{entry.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Status bar chart */}
            <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                <h4 className="font-bold text-white mb-1">Status Distribution</h4>
                <p className="text-xs text-slate-500 mb-5">Current ticket status across all incidents</p>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {statusData.map((entry, i) => (
                                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name.replace(/ /g, '_')] || CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
