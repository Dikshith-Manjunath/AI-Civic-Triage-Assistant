import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, isAdmin } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';
import PendingApprovals from '@/components/PendingApprovals';
import Footer from '@/components/Footer';
import db from '@/lib/db';

const DEPT_CONFIG = [
    { key: 'bbmp', label: 'BBMP', full: 'Bruhat Bengaluru Mahanagara Palike', icon: 'corporate_fare', logo: '/logos/BBMP.jpg', color: 'bg-orange-500', accent: '#F97316' },
    { key: 'bwssb', label: 'BWSSB', full: 'Water Supply & Sewerage Board', icon: 'water_drop', logo: '/logos/BWSSB.webp', color: 'bg-blue-500', accent: '#38BDF8' },
    { key: 'bescom', label: 'BESCOM', full: 'Electricity Supply Company', icon: 'bolt', logo: '/logos/BESCOM.png', color: 'bg-yellow-500', accent: '#FACC15' },
    { key: 'bmtc', label: 'BMTC', full: 'Metropolitan Transport Corp', icon: 'directions_bus', logo: '/logos/BMTC.jpg', color: 'bg-green-500', accent: '#22C55E' },
    { key: 'bda', label: 'BDA', full: 'Bangalore Development Authority', icon: 'architecture', logo: '/logos/BDA.png', color: 'bg-purple-500', accent: '#A78BFA' },
    { key: 'bcp', label: 'BCP', full: 'Bengaluru City Police', icon: 'local_police', logo: '/logos/BCP.jpg', color: 'bg-indigo-500', accent: '#818CF8' },
    { key: 'gba', label: 'GBA', full: 'Governing Body Authority', icon: 'admin_panel_settings', logo: '/logos/GBA.jpg', color: 'bg-rose-500', accent: '#FB7185' },
];

export default async function AdminDashboard() {
    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) redirect('/login');

    const user = await verifyToken(token);
    if (!user || !isAdmin(user)) redirect('/login');

    const totalUsers = (db.prepare('SELECT COUNT(*) as n FROM users').get() as any).n as number;
    const adminCount = (db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'admin'").get() as any).n as number;
    const officerCount = totalUsers - adminCount;
    const pendingCount = (db.prepare("SELECT COUNT(*) as n FROM users WHERE status = 'pending'").get() as any).n as number;

    const pendingUsers = JSON.parse(JSON.stringify(
        db.prepare("SELECT id, email, username, department, role, full_name, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC").all()
    ));

    const deptRows = db
        .prepare("SELECT department, COUNT(*) as n FROM users WHERE role != 'admin' GROUP BY department")
        .all() as { department: string; n: number }[];
    const deptMap = Object.fromEntries(deptRows.map((r) => [r.department, r.n]));

    const allUsers = JSON.parse(JSON.stringify(
        db.prepare('SELECT id, email, username, department, role, status, full_name, created_at, last_login FROM users ORDER BY created_at DESC').all()
    ));

    const summaryCards = [
        { label: 'Total Users', value: totalUsers, icon: 'group', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
        { label: 'Officers', value: officerCount, icon: 'badge', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
        { label: 'Admins', value: adminCount, icon: 'shield_person', color: '#FACC15', bg: 'rgba(250,204,21,0.1)' },
        { label: 'Pending Approval', value: pendingCount, icon: 'hourglass_top', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    ];

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
            {/* Top Bar */}
            <header className="sticky top-0 z-50 border-b border-white/[0.06]" style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)' }}>
                <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] text-[#020617]">
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-display text-lg font-700 text-white">Civic<span className="text-[#38BDF8]">Flow</span></span>
                            <span className="inline-flex items-center rounded-full bg-[#FACC15]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#FACC15] uppercase tracking-wider border border-[#FACC15]/20">
                                Admin
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-slate-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
                            <span className="font-medium text-slate-300">{user.username}</span>
                        </div>
                        <LogoutButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 space-y-10">
                {/* Welcome */}
                <div>
                    <h1 className="font-display text-3xl font-800 text-white">System Overview</h1>
                    <p className="mt-1 text-slate-500">Administrator view — all departments and registered users</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                    {summaryCards.map((s) => (
                        <div key={s.label} className="rounded-2xl border border-white/[0.07] p-6 flex items-center gap-5" style={{ background: 'var(--bg-surface)' }}>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ background: s.bg }}>
                                <span className="material-symbols-outlined text-2xl" style={{ color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                            </div>
                            <div>
                                <p className="text-3xl font-display font-800 text-white">{s.value}</p>
                                <p className="text-sm font-medium text-slate-500">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pending Approvals */}
                <section>
                    <h2 className="mb-5 text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#F97316]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
                        Pending Approvals
                        {pendingCount > 0 && (
                            <span className="ml-1 rounded-full bg-[#F97316]/15 border border-[#F97316]/20 px-2.5 py-0.5 text-sm font-bold text-[#F97316]">
                                {pendingCount}
                            </span>
                        )}
                    </h2>
                    <PendingApprovals initialUsers={pendingUsers} />
                </section>

                {/* Departments */}
                <section>
                    <h2 className="mb-5 text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#38BDF8]" style={{ fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
                        Departments
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {DEPT_CONFIG.map((dept) => {
                            const count = deptMap[dept.key] ?? 0;
                            return (
                                <Link
                                    key={dept.key}
                                    href={`/dashboard/${dept.key}`}
                                    className="group rounded-2xl border border-white/[0.07] p-5 flex items-center gap-4 transition-all hover:border-[#38BDF8]/30 hover:shadow-[0_0_28px_rgba(56,189,248,0.08)] cursor-pointer"
                                    style={{ background: 'var(--bg-surface)' }}
                                >
                                    {dept.logo ? (
                                        <img
                                            src={dept.logo}
                                            alt={`${dept.label} logo`}
                                            className="h-12 w-12 shrink-0 rounded-xl object-cover scale-110 ring-1 ring-white/10"
                                        />
                                    ) : (
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${dept.color} text-white`}>
                                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{dept.icon}</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-bold text-white text-sm group-hover:text-[#38BDF8] transition-colors">{dept.label}</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold flex-shrink-0" style={{ background: `${dept.accent}18`, color: dept.accent }}>
                                                    {count}
                                                </span>
                                                <span className="material-symbols-outlined text-slate-700 text-base opacity-0 group-hover:opacity-100 group-hover:text-[#38BDF8] transition-all">arrow_forward</span>
                                            </div>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500 truncate">{dept.full}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* All Users Table */}
                <section>
                    <h2 className="mb-5 text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#38BDF8]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_accounts</span>
                        Registered Users
                        <span className="ml-1 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/15 px-2.5 py-0.5 text-sm font-bold text-[#38BDF8]">
                            {allUsers.length}
                        </span>
                    </h2>
                    <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.06]" style={{ background: 'var(--bg-elevated)' }}>
                                        {['User', 'Email', 'Department', 'Role', 'Status', 'Joined', 'Last Login'].map(h => (
                                            <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {allUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center text-slate-600">
                                                No users registered yet
                                            </td>
                                        </tr>
                                    ) : (
                                        allUsers.map((u: any) => (
                                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#38BDF8]/15 text-[#38BDF8] text-xs font-bold">
                                                            {u.username?.[0]?.toUpperCase() ?? '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-200">{u.username}</p>
                                                            {u.full_name && <p className="text-xs text-slate-500">{u.full_name}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-slate-400">{u.email}</td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center rounded-full bg-[#38BDF8]/10 px-2.5 py-1 text-xs font-semibold text-[#38BDF8] uppercase tracking-wide">
                                                        {u.department}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {u.role === 'admin' ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FACC15]/10 px-2.5 py-1 text-xs font-semibold text-[#FACC15]">
                                                            <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                                                            Admin
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-2.5 py-1 text-xs font-semibold text-[#22C55E]">
                                                            <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                                                            Officer
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                        u.status === 'approved' ? 'bg-[#22C55E]/10 text-[#22C55E]'
                                                        : u.status === 'rejected' ? 'bg-[#F87171]/10 text-[#F87171]'
                                                        : 'bg-[#F97316]/10 text-[#F97316]'
                                                    }`}>
                                                        {u.status || 'approved'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-slate-500 text-xs">
                                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                                <td className="px-5 py-4 text-slate-500 text-xs">
                                                    {u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
