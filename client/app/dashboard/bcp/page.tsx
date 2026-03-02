import db from '@/lib/db';
import Link from 'next/link';

export default async function BCPDashboard() {
    // Fetch tickets for BCP
    const tickets = db
        .prepare("SELECT * FROM tickets WHERE department = 'bcp' ORDER BY created_at DESC")
        .all() as any[];

    // Fallback static tickets if database is empty for BCP (for demonstration of the Stitch design)
    const displayTickets = tickets.length > 0 ? tickets : [
        { ticket_no: 'TK-89422', category: 'Traffic', location: 'Indiranagar, 12th Main', urgency: 'high', status: 'in_progress', icon: 'directions_car' },
        { ticket_no: 'TK-89421', category: 'Public Nuisance', location: 'Koramangala, 5th Block', urgency: 'medium', status: 'open', icon: 'campaign' },
        { ticket_no: 'TK-89420', category: 'Theft', location: 'MG Road Metro', urgency: 'high', status: 'resolved', icon: 'shopping_bag' },
        { ticket_no: 'TK-89419', category: 'Traffic', location: 'Whitefield Main Rd', urgency: 'low', status: 'approved', icon: 'directions_car' },
    ];

    const totalIncidents = tickets.length > 0 ? tickets.length : 842;
    const activePatrols = tickets.length > 0 ? Math.floor(tickets.length / 3) : 156;
    const pendingCases = tickets.length > 0 ? tickets.filter(t => t.status !== 'resolved').length : 42;

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
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#1a2a47] text-white rounded-lg text-sm font-semibold hover:bg-[#1a2a47]/90 transition-shadow shadow-md">
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span>New Incident</span>
                    </button>
                </div>
            </div>

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
                        <span className="text-red-600 flex items-center">+5.2%</span>
                        <span className="text-slate-400">vs last week</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Emergency Response</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">7.2 <span className="text-lg font-normal text-slate-400">mins</span></h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <span className="material-symbols-outlined">bolt</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                        <span className="text-emerald-600 flex items-center"><span className="material-symbols-outlined text-xs mr-1">trending_down</span> 1.4% faster</span>
                        <span className="text-slate-400">Target: 8.0 mins</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Patrols</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">{activePatrols}</h3>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <span className="material-symbols-outlined">local_police</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                        <span className="text-emerald-600">+12 units</span>
                        <span className="text-slate-400">currently on field</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Pending Investigation</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">{pendingCases}</h3>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <span className="material-symbols-outlined">pending_actions</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase">High Priority Cases</span>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h4 className="font-bold text-slate-900">Incident Ticket Queue</h4>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-xs font-semibold bg-slate-100 rounded-lg border border-slate-200">Export CSV</button>
                        <button className="px-3 py-1.5 text-xs font-semibold bg-white rounded-lg border border-slate-200">Filter Status</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Ticket ID</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Urgency</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayTickets.map((t) => (
                                <tr key={t.ticket_no} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-[#1a2a47]">#{t.ticket_no}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <span className="material-symbols-outlined text-slate-400 text-base">{t.icon || 'receipt_long'}</span>
                                            {t.category}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{t.location || 'Bengaluru City'}</td>
                                    <td className="px-6 py-4">
                                        {t.urgency === 'high' || t.urgency === 'critical' ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">{t.urgency}</span>
                                        ) : t.urgency === 'medium' ? (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">{t.urgency}</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase">{t.urgency}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {t.status === 'in_progress' || t.status === 'open' ? (
                                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                            ) : t.status === 'resolved' ? (
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            ) : (
                                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                            )}
                                            <span className="text-slate-700">{t.status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-[#1a2a47] transition-colors">
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Showing {displayTickets.length} of {tickets.length > 0 ? tickets.length : 42} pending investigations</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-white border border-slate-200 rounded text-xs disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 bg-white border border-slate-200 rounded text-xs">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
