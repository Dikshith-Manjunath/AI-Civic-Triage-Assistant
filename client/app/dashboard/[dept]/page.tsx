import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';
import TicketTable from '@/components/TicketTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Urgency int → string mapping ──
const URGENCY_MAP: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' };

// ── Server status → client status mapping ──
const STATUS_MAP: Record<string, string> = {
    pending: 'open',
    awaiting_approval: 'in_progress',
    approved: 'approved',
    rejected: 'rejected',
    filed: 'dispatched',
    resolved: 'resolved',
};

// ── Dept metadata ─────────────────────────────────────────────────────────
const DEPT_META: Record<string, {
    label: string;
    fullName: string;
    icon: string;
    logo: string;
    kpiLabel: string;
    kpiIcon: string;
    categories: Array<{ name: string; pct: number; color: string }>;
}> = {
    bbmp: {
        label: 'BBMP',
        fullName: 'Bruhat Bengaluru Mahanagara Palike',
        icon: 'corporate_fare',
        logo: '/logos/BBMP.jpg',
        kpiLabel: 'SLA Compliance',
        kpiIcon: 'verified',
        categories: [
            { name: 'Road Maintenance', pct: 45, color: 'bg-[#1a2a47]' },
            { name: 'Waste Management', pct: 28, color: 'bg-blue-500' },
            { name: 'Public Lighting', pct: 15, color: 'bg-amber-400' },
            { name: 'Others', pct: 12, color: 'bg-slate-300' },
        ],
    },
    bwssb: {
        label: 'BWSSB',
        fullName: 'Bangalore Water Supply & Sewerage Board',
        icon: 'water_drop',
        logo: '/logos/BWSSB.webp',
        kpiLabel: 'Pressure Compliance',
        kpiIcon: 'opacity',
        categories: [
            { name: 'Water Leakage', pct: 42, color: 'bg-[#1a2a47]' },
            { name: 'Sewage', pct: 28, color: 'bg-blue-500' },
            { name: 'Bills & Payment', pct: 15, color: 'bg-slate-400' },
            { name: 'Others', pct: 15, color: 'bg-slate-200' },
        ],
    },
    bescom: {
        label: 'BESCOM',
        fullName: 'Bangalore Electricity Supply Company',
        icon: 'bolt',
        logo: '/logos/BESCOM.png',
        kpiLabel: 'Grid Uptime',
        kpiIcon: 'electric_bolt',
        categories: [
            { name: 'Power Outage', pct: 38, color: 'bg-[#1a2a47]' },
            { name: 'Meter Issues', pct: 25, color: 'bg-amber-500' },
            { name: 'Street Lights', pct: 22, color: 'bg-blue-500' },
            { name: 'Billing Disputes', pct: 15, color: 'bg-slate-300' },
        ],
    },
    bmtc: {
        label: 'BMTC',
        fullName: 'Bangalore Metropolitan Transport Corp',
        icon: 'directions_bus',
        logo: '/logos/BMTC.jpg',
        kpiLabel: 'On-time Rate',
        kpiIcon: 'schedule',
        categories: [
            { name: 'Route Disruptions', pct: 40, color: 'bg-[#1a2a47]' },
            { name: 'Bus Breakdown', pct: 30, color: 'bg-red-500' },
            { name: 'Overcrowding', pct: 20, color: 'bg-amber-400' },
            { name: 'Stop Damage', pct: 10, color: 'bg-slate-300' },
        ],
    },
    bda: {
        label: 'BDA',
        fullName: 'Bangalore Development Authority',
        icon: 'architecture',
        logo: '/logos/BDA.png',
        kpiLabel: 'Approval Rate',
        kpiIcon: 'assignment_turned_in',
        categories: [
            { name: 'Illegal Construction', pct: 35, color: 'bg-red-500' },
            { name: 'Encroachment', pct: 28, color: 'bg-[#1a2a47]' },
            { name: 'OC Requests', pct: 22, color: 'bg-green-500' },
            { name: 'Layout Violations', pct: 15, color: 'bg-amber-400' },
        ],
    },
    gba: {
        label: 'GBA',
        fullName: 'Governing Body Authority',
        icon: 'admin_panel_settings',
        logo: '/logos/GBA.jpg',
        kpiLabel: 'Compliance Index',
        kpiIcon: 'policy',
        categories: [
            { name: 'Policy Queries', pct: 40, color: 'bg-[#1a2a47]' },
            { name: 'Audit Findings', pct: 30, color: 'bg-amber-500' },
            { name: 'Directives', pct: 20, color: 'bg-blue-500' },
            { name: 'Others', pct: 10, color: 'bg-slate-300' },
        ],
    },
};

type Props = { params: Promise<{ dept: string }> };

/**
 * Transform a server-side ClickHouse ticket into the shape expected
 * by the client's TicketTable / TicketDrawer components.
 */
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
        location: null,
        ward: null,
        urgency: URGENCY_MAP[t.urgency] ?? 'medium',
        status: STATUS_MAP[t.status] || t.status || 'open',
        assignee: t.approved_by || null,
        created_by: t.channel || 'web',
        created_at: t.timestamp || new Date().toISOString(),
        updated_at: t.approved_at && t.approved_at !== '1970-01-01T00:00:00'
            ? t.approved_at
            : t.timestamp || new Date().toISOString(),
    };
}

export default async function DeptDashboard({ params }: Props) {
    const { dept } = await params;
    if (!DEPT_META[dept]) notFound();

    // Auth
    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) redirect('/login');
    const user = await verifyToken(token);
    if (!user) redirect('/login');
    // Officers can only see their own dept; admins can see any
    if (user.role !== 'admin' && user.department !== dept) redirect(`/dashboard/${user.department}`);

    // ── Fetch tickets from the FastAPI server (ClickHouse) ──
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
            console.error(`[dashboard] Server returned ${res.status}`);
            serverError = true;
        }
    } catch (e: any) {
        console.error('[dashboard] Failed to fetch from server:', e?.message || e);
        serverError = true;
    }

    // Compute KPIs
    const totalTickets = tickets.length;
    const activeTickets = tickets.filter(t => !['resolved', 'rejected'].includes(t.status)).length;
    const criticalCount = tickets.filter(t => t.urgency === 'high' && t.status !== 'resolved').length;

    const resolvedAllTime = tickets.filter(t => t.status === 'resolved').length;
    const resolutionRate = totalTickets > 0 ? ((resolvedAllTime / totalTickets) * 100).toFixed(1) : '0';

    const approvedAllTime = tickets.filter(t => ['approved', 'dispatched', 'resolved'].includes(t.status)).length;
    const approvalRate = totalTickets > 0 ? ((approvedAllTime / totalTickets) * 100).toFixed(1) : '0';

    // Compute category distribution dynamically from ticket data
    const categoryCounts: Record<string, number> = {};
    for (const t of tickets) {
        const cat = t.category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    const categoryColors = ['bg-[#1a2a47]', 'bg-blue-500', 'bg-amber-400', 'bg-red-500', 'bg-green-500', 'bg-slate-300'];
    const dynamicCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count], i) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            pct: totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0,
            color: categoryColors[i % categoryColors.length],
        }));

    // Use dynamic categories if we have real data, otherwise fall back to meta
    const meta = DEPT_META[dept];
    const displayCategories = dynamicCategories.length > 0 ? dynamicCategories : meta.categories;

    // Create recent "events" from the latest tickets
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
        rectify: 'build', reopen: 'refresh', comment: 'chat',
    };
    const EVENT_COLOR: Record<string, string> = {
        created: 'bg-blue-50 text-blue-600', resolved: 'bg-green-50 text-green-600',
        approved: 'bg-emerald-50 text-emerald-600', rejected: 'bg-red-50 text-red-600',
        assigned: 'bg-blue-50 text-blue-600', dispatched: 'bg-indigo-50 text-indigo-600',
        rectify: 'bg-amber-50 text-amber-600', comment: 'bg-slate-50 text-slate-500',
        reopen: 'bg-slate-50 text-slate-500',
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

    return (
        <DashboardLayout dept={dept} deptLabel={meta.label} deptIcon={meta.icon} deptLogo={meta.logo || undefined} username={user.username}>
            {/* ── Page Title ──────────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="text-3xl font-black tracking-tight text-[#1a2a47]">{meta.label} Dashboard</h1>
                <p className="text-slate-500 mt-1">{meta.fullName} — Operations Management</p>
            </div>

            {/* ── Server Status Banner ──────────────────────────────── */}
            {serverError && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-600">warning</span>
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Server Connection Issue</p>
                        <p className="text-xs text-amber-600">Could not fetch live ticket data from the server. Showing cached or empty state.</p>
                    </div>
                </div>
            )}

            {/* ── KPI Cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Active Tickets */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg material-symbols-outlined">receipt_long</span>
                        <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">Active</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Active Tickets</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-900">{activeTickets.toLocaleString()}</h3>
                </div>
                {/* Critical */}
                <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <span className="p-2 bg-red-50 text-red-600 rounded-lg material-symbols-outlined">priority_high</span>
                        {criticalCount > 0 && (
                            <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">High Alert</span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">High Urgency</p>
                    <h3 className={`text-2xl font-bold mt-1 ${criticalCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {criticalCount}
                    </h3>
                </div>
                {/* Approval Rate */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg material-symbols-outlined">assignment_turned_in</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Approval Rate</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-900">{approvalRate}%</h3>
                </div>
                {/* Resolution Rate */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <span className="p-2 bg-[#1a2a47]/10 text-[#1a2a47] rounded-lg material-symbols-outlined">check_circle</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Resolution Rate</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-900">{resolutionRate}%</h3>
                </div>
            </div>

            {/* ── Main Grid ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Ticket Queue (col-span-2) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-lg text-slate-900">Ticket Queue</h2>
                        <span className="text-sm text-slate-500">{totalTickets} total</span>
                    </div>
                    {/* TicketTable is a Client Component */}
                    <TicketTable initialTickets={tickets} />
                </div>

                {/* Right: Volume chart + Activity feed */}
                <div className="space-y-8">
                    {/* Volume by Category */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="font-bold text-slate-900 mb-6">Volume by Category</h2>
                        <div className="space-y-4">
                            {displayCategories.map(cat => (
                                <div key={cat.name} className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                        <span>{cat.name}</span>
                                        <span>{cat.pct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className={`${cat.color} h-2 rounded-full transition-all`} style={{ width: `${cat.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="font-bold text-slate-900 mb-6">Recent Activity</h2>
                        <div className="space-y-5">
                            {recentActivity.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">No recent activity.</p>
                            )}
                            {recentActivity.map(ev => (
                                <div key={ev.id} className="flex gap-4">
                                    <div className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center ${EVENT_COLOR[ev.action] ?? 'bg-slate-50 text-slate-500'}`}>
                                        <span className="material-symbols-outlined text-sm">{EVENT_ICON[ev.action] ?? 'circle'}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">
                                            #{ev.ticket_no} — {ev.action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {timeAgo(ev.created_at)}
                                            {ev.actor && ` • by ${ev.actor}`}
                                            {ev.note && ` — "${ev.note}"`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
