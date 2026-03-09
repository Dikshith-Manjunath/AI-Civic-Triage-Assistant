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

/**
 * Transform a server-side ClickHouse ticket into the shape expected
 * by the client's TicketTable / TicketDrawer components.
 */
function transformTicket(t: any, idx: number) {
    const authority = (t.authority || '').toUpperCase();
    const prefix = authority.slice(0, 2) || 'BC';
    const ticketNo = `${prefix}-${String(idx + 1).padStart(4, '0')}`;

    return {
        id: t.id,
        ticket_no: ticketNo,
        department: (t.authority || 'bcp').toLowerCase(),
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

export default async function BCPDashboard() {
    // ── Fetch tickets from the FastAPI server (ClickHouse) ──
    let tickets: any[] = [];
    let serverError = false;
    try {
        const res = await fetch(
            `${API_URL}/api/complaints/by-dept/${encodeURIComponent('bcp')}?limit=200`,
            { cache: 'no-store', signal: AbortSignal.timeout(8000) },
        );
        if (res.ok) {
            const data = await res.json();
            tickets = (Array.isArray(data) ? data : []).map(transformTicket);
        } else {
            console.error(`[bcp-dashboard] Server returned ${res.status}`);
            serverError = true;
        }
    } catch (e: any) {
        console.error('[bcp-dashboard] Failed to fetch from server:', e?.message || e);
        serverError = true;
    }

    // ── Compute KPIs ──
    const totalIncidents = tickets.length;
    const activeTickets = tickets.filter(t => !['resolved', 'rejected'].includes(t.status)).length;
    const criticalCount = tickets.filter(t => t.urgency === 'high' && t.status !== 'resolved').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
    const resolutionRate = totalIncidents > 0 ? ((resolvedCount / totalIncidents) * 100).toFixed(1) : '0';

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Command Dashboard</h2>
                    <p className="text-slate-500 text-sm mt-1">Real-time oversight of Bengaluru City Police activities.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-lg">calendar_today</span>
                        <span>Last 24 Hours</span>
                    </button>
                </div>
            </div>

            {/* Server Error Banner */}
            {serverError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-600">warning</span>
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Server Connection Issue</p>
                        <p className="text-xs text-amber-600">Could not fetch live ticket data from the server. Showing cached or empty state.</p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Incidents</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">{totalIncidents}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <span className="material-symbols-outlined">description</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                        <span className="text-slate-400">from server</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Cases</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">{activeTickets}</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <span className="material-symbols-outlined">bolt</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                        <span className="text-emerald-600 flex items-center">Pending resolution</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">High Urgency</p>
                            <h3 className={`text-3xl font-bold mt-1 ${criticalCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{criticalCount}</h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <span className="material-symbols-outlined">priority_high</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        {criticalCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded uppercase">Needs Attention</span>
                        )}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Resolution Rate</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">{resolutionRate}%</h3>
                        </div>
                        <div className="p-2 bg-[#1a2a47]/10 rounded-lg text-[#1a2a47]">
                            <span className="material-symbols-outlined">check_circle</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                        <span className="text-slate-400">{resolvedCount} resolved of {totalIncidents}</span>
                    </div>
                </div>
            </div>

            {/* Ticket Queue — Interactive */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900">Incident Ticket Queue</h4>
                    <span className="text-sm text-slate-500">{totalIncidents} total</span>
                </div>
                <TicketTable initialTickets={tickets} />
            </div>
        </div>
    );
}
