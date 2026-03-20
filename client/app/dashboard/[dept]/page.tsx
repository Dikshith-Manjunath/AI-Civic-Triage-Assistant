import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';
import TicketTable from '@/components/TicketTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const URGENCY_MAP: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' };
const STATUS_MAP: Record<string, string> = {
    pending: 'open',
    awaiting_approval: 'in_progress',
    approved: 'approved',
    rejected: 'rejected',
    filed: 'dispatched',
    resolved: 'resolved',
};

const DEPT_META: Record<string, {
    label: string;
    fullName: string;
    icon: string;
    logo: string;
    kpiLabel: string;
    kpiIcon: string;
    accent: string;
    categories: Array<{ name: string; pct: number; color: string }>;
}> = {
    bbmp: {
        label: 'BBMP', fullName: 'Bruhat Bengaluru Mahanagara Palike', icon: 'corporate_fare', logo: '/logos/BBMP.jpg',
        kpiLabel: 'SLA Compliance', kpiIcon: 'verified', accent: '#F97316',
        categories: [
            { name: 'Road Maintenance', pct: 45, color: 'bg-orange-500' },
            { name: 'Waste Management', pct: 28, color: 'bg-blue-500' },
            { name: 'Public Lighting', pct: 15, color: 'bg-amber-400' },
            { name: 'Others', pct: 12, color: 'bg-slate-600' },
        ],
    },
    bwssb: {
        label: 'BWSSB', fullName: 'Bangalore Water Supply & Sewerage Board', icon: 'water_drop', logo: '/logos/BWSSB.webp',
        kpiLabel: 'Pressure Compliance', kpiIcon: 'opacity', accent: '#38BDF8',
        categories: [
            { name: 'Water Leakage', pct: 42, color: 'bg-sky-500' },
            { name: 'Sewage', pct: 28, color: 'bg-blue-600' },
            { name: 'Bills & Payment', pct: 15, color: 'bg-slate-500' },
            { name: 'Others', pct: 15, color: 'bg-slate-600' },
        ],
    },
    bescom: {
        label: 'BESCOM', fullName: 'Bangalore Electricity Supply Company', icon: 'bolt', logo: '/logos/BESCOM.png',
        kpiLabel: 'Grid Uptime', kpiIcon: 'electric_bolt', accent: '#FACC15',
        categories: [
            { name: 'Power Outage', pct: 38, color: 'bg-yellow-500' },
            { name: 'Meter Issues', pct: 25, color: 'bg-amber-500' },
            { name: 'Street Lights', pct: 22, color: 'bg-blue-500' },
            { name: 'Billing Disputes', pct: 15, color: 'bg-slate-600' },
        ],
    },
    bmtc: {
        label: 'BMTC', fullName: 'Bangalore Metropolitan Transport Corp', icon: 'directions_bus', logo: '/logos/BMTC.jpg',
        kpiLabel: 'On-time Rate', kpiIcon: 'schedule', accent: '#22C55E',
        categories: [
            { name: 'Route Disruptions', pct: 40, color: 'bg-green-500' },
            { name: 'Bus Breakdown', pct: 30, color: 'bg-red-500' },
            { name: 'Overcrowding', pct: 20, color: 'bg-amber-400' },
            { name: 'Stop Damage', pct: 10, color: 'bg-slate-600' },
        ],
    },
    bda: {
        label: 'BDA', fullName: 'Bangalore Development Authority', icon: 'architecture', logo: '/logos/BDA.png',
        kpiLabel: 'Approval Rate', kpiIcon: 'assignment_turned_in', accent: '#A78BFA',
        categories: [
            { name: 'Illegal Construction', pct: 35, color: 'bg-red-500' },
            { name: 'Encroachment', pct: 28, color: 'bg-purple-500' },
            { name: 'OC Requests', pct: 22, color: 'bg-green-500' },
            { name: 'Layout Violations', pct: 15, color: 'bg-amber-400' },
        ],
    },
    gba: {
        label: 'GBA', fullName: 'Governing Body Authority', icon: 'admin_panel_settings', logo: '/logos/GBA.jpg',
        kpiLabel: 'Compliance Index', kpiIcon: 'policy', accent: '#FB7185',
        categories: [
            { name: 'Policy Queries', pct: 40, color: 'bg-rose-500' },
            { name: 'Audit Findings', pct: 30, color: 'bg-amber-500' },
            { name: 'Directives', pct: 20, color: 'bg-blue-500' },
            { name: 'Others', pct: 10, color: 'bg-slate-600' },
        ],
    },
};

type Props = { params: Promise<{ dept: string }> };

function transformTicket(t: any, idx: number) {
    const authority = (t.authority || '').toUpperCase();
    const prefix = authority.slice(0, 2) || 'XX';
    const ticketNo = `${prefix}-${String(idx + 1).padStart(4, '0')}`;
    return {
        id: t.id,
        ticket_no: ticketNo,
        department: (t.authority || '').toLowerCase(),
        category: t.dept || 'general',
        title: t.summary || 'Untitled',
        description: t.raw_text || t.reply || null,
        location: null, ward: null,
        urgency: URGENCY_MAP[t.urgency] ?? 'medium',
        status: STATUS_MAP[t.status] || t.status || 'open',
        assignee: t.approved_by || null,
        created_by: t.channel || 'web',
        created_at: t.timestamp || new Date().toISOString(),
        updated_at: t.approved_at && t.approved_at !== '1970-01-01T00:00:00'
            ? t.approved_at : t.timestamp || new Date().toISOString(),
    };
}

export default async function DeptDashboard({ params }: Props) {
    const { dept } = await params;
    if (!DEPT_META[dept]) notFound();

    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) redirect('/login');
    const user = await verifyToken(token);
    if (!user) redirect('/login');
    if (user.role !== 'admin' && user.department !== dept) redirect(`/dashboard/${user.department}`);

    let tickets: any[] = [];
    let serverError = false;
    try {
        const res = await fetch(
            `${API_URL}/api/complaints/by-dept/${encodeURIComponent(dept)}?limit=200`,
            { cache: 'no-store', signal: AbortSignal.timeout(8000) },
        );
        if (res.ok) {
            const data = await res.json();
            tickets = (Array.isArray(data) ? data : []).map(transformTicket);
        } else {
            serverError = true;
        }
    } catch {
        serverError = true;
    }

    const totalTickets = tickets.length;
    const activeTickets = tickets.filter(t => !['resolved', 'rejected'].includes(t.status)).length;
    const criticalCount = tickets.filter(t => t.urgency === 'high' && t.status !== 'resolved').length;
    const resolvedAllTime = tickets.filter(t => t.status === 'resolved').length;
    const resolutionRate = totalTickets > 0 ? ((resolvedAllTime / totalTickets) * 100).toFixed(1) : '0';
    const approvedAllTime = tickets.filter(t => ['approved', 'dispatched', 'resolved'].includes(t.status)).length;
    const approvalRate = totalTickets > 0 ? ((approvedAllTime / totalTickets) * 100).toFixed(1) : '0';

    const categoryCounts: Record<string, number> = {};
    for (const t of tickets) {
        const cat = t.category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    const catColors = ['bg-[#38BDF8]', 'bg-[#818CF8]', 'bg-[#FACC15]', 'bg-[#F87171]', 'bg-[#22C55E]', 'bg-slate-600'];
    const dynamicCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, count], i) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            pct: totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0,
            color: catColors[i % catColors.length],
        }));

    const meta = DEPT_META[dept];
    const displayCategories = dynamicCategories.length > 0 ? dynamicCategories : meta.categories;

    const recentActivity = tickets.slice(0, 5).map((t, i) => ({
        id: i,
        ticket_no: t.ticket_no,
        action: t.status === 'resolved' ? 'resolved'
            : t.status === 'approved' ? 'approved'
            : t.status === 'rejected' ? 'rejected'
            : t.status === 'in_progress' ? 'assigned'
            : t.status === 'dispatched' ? 'dispatched'
            : 'created',
        actor: t.assignee || t.created_by || 'System',
        note: t.title,
        created_at: t.created_at,
        category: t.category,
    }));

    const EVENT_ICON: Record<string, string> = {
        created: 'add_circle', resolved: 'check_circle', approved: 'assignment_turned_in',
        rejected: 'cancel', assigned: 'person', dispatched: 'local_shipping',
    };
    const EVENT_COLOR: Record<string, { text: string; bg: string }> = {
        created:    { text: 'text-[#38BDF8]', bg: 'bg-[#38BDF8]/15' },
        resolved:   { text: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15' },
        approved:   { text: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15' },
        rejected:   { text: 'text-[#F87171]', bg: 'bg-[#F87171]/15' },
        assigned:   { text: 'text-[#38BDF8]', bg: 'bg-[#38BDF8]/15' },
        dispatched: { text: 'text-[#818CF8]', bg: 'bg-[#818CF8]/15' },
    };

    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    const kpiCards = [
        {
            label: 'Active Tickets', value: activeTickets, icon: 'receipt_long',
            color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', badge: 'Live',
        },
        {
            label: 'High Urgency', value: criticalCount, icon: 'priority_high',
            color: criticalCount > 0 ? '#F87171' : '#94A3B8',
            bg: criticalCount > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(148,163,184,0.1)',
            badge: criticalCount > 0 ? 'Alert' : null,
        },
        {
            label: 'Approval Rate', value: `${approvalRate}%`, icon: 'assignment_turned_in',
            color: '#22C55E', bg: 'rgba(34,197,94,0.1)', badge: null,
        },
        {
            label: 'Resolution Rate', value: `${resolutionRate}%`, icon: 'check_circle',
            color: meta.accent, bg: `${meta.accent}1A`, badge: null,
        },
    ];

    return (
        <DashboardLayout dept={dept} deptLabel={meta.label} deptIcon={meta.icon} deptLogo={meta.logo || undefined} username={user.username}>
            {/* Page Title */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    {meta.logo && (
                        <img src={meta.logo} alt={`${meta.label} logo`} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10" />
                    )}
                    <div>
                        <h1 className="font-display text-2xl font-800 text-white">{meta.label} Dashboard</h1>
                        <p className="text-slate-500 text-sm">{meta.fullName} — Operations Management</p>
                    </div>
                </div>
            </div>

            {/* Server Error Banner */}
            {serverError && (
                <div className="mb-6 border border-[#F97316]/20 rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(249,115,22,0.08)' }}>
                    <span className="material-symbols-outlined text-[#F97316]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    <div>
                        <p className="text-sm font-semibold text-[#F97316]">Server Connection Issue</p>
                        <p className="text-xs text-slate-500 mt-0.5">Could not fetch live ticket data. Showing empty state.</p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpiCards.map((k) => (
                    <div key={k.label} className="rounded-2xl border border-white/[0.07] p-6 transition-all hover:border-white/[0.12]" style={{ background: 'var(--bg-surface)' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: k.bg }}>
                                <span className="material-symbols-outlined text-xl" style={{ color: k.color, fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
                            </div>
                            {k.badge && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: k.bg, color: k.color }}>
                                    {k.badge}
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{k.label}</p>
                        <h3 className="font-display text-2xl font-800 mt-1" style={{ color: k.color }}>{k.value}</h3>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ticket Queue (col-span-2) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-white">Ticket Queue</h2>
                        <span className="text-xs text-slate-500 font-semibold">{totalTickets} total</span>
                    </div>
                    <TicketTable initialTickets={tickets} />
                </div>

                {/* Right column */}
                <div className="space-y-6">
                    {/* Volume by Category */}
                    <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                        <h2 className="font-bold text-white mb-5 text-sm">Volume by Category</h2>
                        <div className="space-y-4">
                            {displayCategories.map(cat => (
                                <div key={cat.name} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                                        <span className="capitalize">{cat.name}</span>
                                        <span>{cat.pct}%</span>
                                    </div>
                                    <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bg-elevated)' }}>
                                        <div
                                            className={`${cat.color} h-1.5 rounded-full transition-all duration-700`}
                                            style={{ width: `${cat.pct}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                        <h2 className="font-bold text-white mb-5 text-sm">Recent Activity</h2>
                        <div className="space-y-4">
                            {recentActivity.length === 0 && (
                                <p className="text-xs text-slate-600 text-center py-4">No recent activity.</p>
                            )}
                            {recentActivity.map(ev => {
                                const ec = EVENT_COLOR[ev.action] ?? { text: 'text-slate-500', bg: 'bg-slate-800' };
                                return (
                                    <div key={ev.id} className="flex gap-3">
                                        <div className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center ${ec.bg}`}>
                                            <span className={`material-symbols-outlined text-sm ${ec.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                                {EVENT_ICON[ev.action] ?? 'circle'}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-300 truncate">
                                                #{ev.ticket_no} — {ev.action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                            </p>
                                            <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                                                {timeAgo(ev.created_at)}
                                                {ev.actor && ` • ${ev.actor}`}
                                                {ev.note && ` — "${ev.note}"`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
