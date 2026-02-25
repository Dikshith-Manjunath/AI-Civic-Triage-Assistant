import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, isAdmin } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';
import db from '@/lib/db';

const DEPT_CONFIG = [
    { key: 'bbmp', label: 'BBMP', full: 'Bruhat Bengaluru Mahanagara Palike', icon: 'corporate_fare', color: 'bg-orange-500' },
    { key: 'bwssb', label: 'BWSSB', full: 'Water Supply & Sewerage Board', icon: 'water_drop', color: 'bg-blue-500' },
    { key: 'bescom', label: 'BESCOM', full: 'Electricity Supply Company', icon: 'bolt', color: 'bg-yellow-500' },
    { key: 'bmtc', label: 'BMTC', full: 'Metropolitan Transport Corp', icon: 'directions_bus', color: 'bg-green-500' },
    { key: 'bda', label: 'BDA', full: 'Bangalore Development Authority', icon: 'architecture', color: 'bg-purple-500' },
    { key: 'gba', label: 'GBA', full: 'Governing Body Authority', icon: 'admin_panel_settings', color: 'bg-rose-500' },
];

export default async function AdminDashboard() {
    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) redirect('/login');

    const user = await verifyToken(token);
    if (!user || !isAdmin(user)) redirect('/login');

    // ── Pull stats from users DB ──
    const totalUsers = (db.prepare('SELECT COUNT(*) as n FROM users').get() as any).n as number;
    const adminCount = (db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'admin'").get() as any).n as number;
    const officerCount = totalUsers - adminCount;

    // Users per department
    const deptRows = db
        .prepare("SELECT department, COUNT(*) as n FROM users WHERE role != 'admin' GROUP BY department")
        .all() as { department: string; n: number }[];
    const deptMap = Object.fromEntries(deptRows.map((r) => [r.department, r.n]));

    // All users list
    const allUsers = db
        .prepare('SELECT id, email, username, department, role, full_name, created_at, last_login FROM users ORDER BY created_at DESC')
        .all() as any[];

    return (
        <div className="min-h-screen bg-[#f6f7f8]">
            {/* ── Top Bar ── */}
            <header className="sticky top-0 z-50 bg-[#1a2a47] border-b border-white/10 shadow-lg">
                <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                        </div>
                        <div>
                            <span className="text-lg font-extrabold tracking-tight text-white">CivicFlow</span>
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                                Admin
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-white/70">
                            <span className="material-symbols-outlined text-base">shield_person</span>
                            <span className="font-medium text-white">{user.username}</span>
                        </div>
                        <LogoutButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 space-y-10">
                {/* ── Welcome ── */}
                <div>
                    <h1 className="text-3xl font-black text-slate-900">System Overview</h1>
                    <p className="mt-1 text-slate-500">
                        Administrator view — all departments and registered users
                    </p>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    {[
                        { label: 'Total Users', value: totalUsers, icon: 'group', color: 'text-[#1a2a47]', bg: 'bg-[#1a2a47]/10' },
                        { label: 'Officers', value: officerCount, icon: 'badge', color: 'text-green-700', bg: 'bg-green-100' },
                        { label: 'Admins', value: adminCount, icon: 'shield_person', color: 'text-amber-700', bg: 'bg-amber-100' },
                    ].map((s) => (
                        <div key={s.label} className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm flex items-center gap-5">
                            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                                <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">{s.value}</p>
                                <p className="text-sm font-medium text-slate-500">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Per-Department Breakdown ── */}
                <section>
                    <h2 className="mb-5 text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#1a2a47]">corporate_fare</span>
                        Departments
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {DEPT_CONFIG.map((dept) => {
                            const count = deptMap[dept.key] ?? 0;
                            return (
                                <div
                                    key={dept.key}
                                    className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
                                >
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${dept.color} text-white`}>
                                        <span className="material-symbols-outlined">{dept.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-slate-900">{dept.label}</p>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-bold text-slate-700">
                                                {count} {count === 1 ? 'user' : 'users'}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500 truncate">{dept.full}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ── All Users Table ── */}
                <section>
                    <h2 className="mb-5 text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#1a2a47]">manage_accounts</span>
                        Registered Users
                        <span className="ml-1 rounded-full bg-[#1a2a47]/10 px-2.5 py-0.5 text-sm font-bold text-[#1a2a47]">
                            {allUsers.length}
                        </span>
                    </h2>
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Login</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                                                No users registered yet
                                            </td>
                                        </tr>
                                    ) : (
                                        allUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a2a47] text-white text-xs font-bold">
                                                            {u.username?.[0]?.toUpperCase() ?? '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{u.username}</p>
                                                            {u.full_name && (
                                                                <p className="text-xs text-slate-400">{u.full_name}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-slate-600">{u.email}</td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                                        {u.department}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {u.role === 'admin' ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                                            <span className="material-symbols-outlined text-[12px]">shield</span>
                                                            Admin
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                                                            <span className="material-symbols-outlined text-[12px]">badge</span>
                                                            Officer
                                                        </span>
                                                    )}
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
        </div>
    );
}
