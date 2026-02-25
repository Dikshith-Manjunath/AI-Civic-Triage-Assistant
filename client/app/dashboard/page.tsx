import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;

    if (!token) redirect('/login');

    const user = await verifyToken(token);
    if (!user) redirect('/login');

    const DEPT_LABELS: Record<string, string> = {
        bbmp: 'BBMP — Bruhat Bengaluru Mahanagara Palike',
        bwssb: 'BWSSB — Bangalore Water Supply & Sewerage Board',
        bescom: 'BESCOM — Bangalore Electricity Supply Company',
        bmtc: 'BMTC — Bangalore Metropolitan Transport Corp',
        bda: 'BDA — Bangalore Development Authority',
        gba: 'GBA — Governing Body Authority',
    };

    const DEPT_ICONS: Record<string, string> = {
        bbmp: 'corporate_fare',
        bwssb: 'water_drop',
        bescom: 'bolt',
        bmtc: 'directions_bus',
        bda: 'architecture',
        gba: 'admin_panel_settings',
    };

    return (
        <div className="min-h-screen bg-[#f6f7f8]">
            {/* Top bar */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a2a47] text-white">
                            <span className="material-symbols-outlined text-lg">account_balance</span>
                        </div>
                        <span className="text-lg font-extrabold tracking-tight text-[#1a2a47]">CivicFlow</span>
                        <span className="hidden md:inline text-slate-300 mx-2">|</span>
                        <span className="hidden md:inline text-sm font-medium text-slate-500">
                            {DEPT_LABELS[user.department] || user.department.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
                            <span className="material-symbols-outlined text-base">person</span>
                            <span className="font-medium">{user.username}</span>
                        </div>
                        <LogoutButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
                {/* Welcome */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a2a47] text-white shadow-lg shadow-[#1a2a47]/20">
                            <span className="material-symbols-outlined text-2xl">
                                {DEPT_ICONS[user.department] || 'admin_panel_settings'}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Welcome back,</p>
                            <h1 className="text-3xl font-black text-slate-900">
                                {user.username} 👋
                            </h1>
                        </div>
                    </div>
                    <p className="text-slate-500 mt-3">
                        You are logged in to the{' '}
                        <span className="font-semibold text-[#1a2a47]">
                            {user.department.toUpperCase()}
                        </span>{' '}
                        dashboard. Full department dashboards are coming soon.
                    </p>
                </div>

                {/* Coming Soon placeholder */}
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1a2a47]/5">
                        <span className="material-symbols-outlined text-4xl text-[#1a2a47]">construction</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Dashboard Coming Soon</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        The full {user.department.toUpperCase()} department dashboard is being built. Check back soon for real-time ticket management, analytics, and more.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3 justify-center">
                        <Link
                            href="/"
                            className="rounded-xl bg-[#1a2a47] px-6 py-3 text-sm font-bold text-white hover:bg-[#243761] transition-all"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>

                {/* Session Info */}
                <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-600">verified</span>
                    <div>
                        <p className="text-sm font-semibold text-green-800">Authenticated Session Active</p>
                        <p className="text-xs text-green-600">
                            JWT token valid • Department: {user.department.toUpperCase()} • Role: {user.role}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
