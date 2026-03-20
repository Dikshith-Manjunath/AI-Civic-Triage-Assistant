import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

export default async function BCPLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) redirect('/login');

    const user = await verifyToken(token);
    if (!user || (user.department !== 'bcp' && user.role !== 'admin')) {
        redirect('/dashboard');
    }

    const initials = user.username.substring(0, 2).toUpperCase();

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
            {/* ── Sidebar ───────────────────────────────────────── */}
            <aside className="w-64 flex-shrink-0 border-r border-white/[0.06] hidden lg:flex flex-col" style={{ background: 'var(--bg-surface)' }}>
                {/* Brand */}
                <div className="p-5 flex items-center gap-3 border-b border-white/[0.06]">
                    <img alt="BCP Emblem" className="h-10 w-10 object-cover rounded-xl ring-1 ring-white/10 scale-110" src="/logos/BCP.jpg" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Department</span>
                        <span className="text-sm font-bold text-white leading-tight">Bengaluru City Police</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    <Link
                        href="/dashboard/bcp"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white font-semibold text-sm"
                        style={{ background: 'rgba(56,189,248,0.1)', borderLeft: '2px solid #38BDF8' }}
                    >
                        <span className="material-symbols-outlined text-[#38BDF8] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                        Dashboard
                    </Link>
                    <Link
                        href="/dashboard/bcp/reports"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-lg">analytics</span>
                        Reports &amp; Charts
                    </Link>
                    <Link
                        href="/dashboard/bcp"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-lg">confirmation_number</span>
                        Incident Tickets
                    </Link>
                    <span className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 cursor-not-allowed text-sm">
                        <span className="material-symbols-outlined text-lg">shield_person</span>
                        Patrol Status
                        <span className="ml-auto text-[9px] bg-white/[0.05] text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">Soon</span>
                    </span>
                </nav>

                {/* User chip */}
                <div className="p-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="w-8 h-8 rounded-full bg-[#818CF8]/20 border border-white/10 flex items-center justify-center text-[#818CF8] font-bold text-xs flex-shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate">{user.username}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{user.role}</p>
                        </div>
                        <LogoutButton compact />
                    </div>
                </div>
            </aside>

            {/* ── Main Content ──────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Nav */}
                <header className="h-16 border-b border-white/[0.06] sticky top-0 z-20 px-6 flex items-center justify-between flex-shrink-0" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(16px)' }}>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] text-[#020617]">
                                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>local_police</span>
                            </div>
                            <h1 className="font-display text-lg font-700 text-white">Civic<span className="text-[#38BDF8]">Flow</span></h1>
                        </div>
                        <div className="h-5 w-px bg-white/10 mx-1"></div>
                        <span className="text-sm font-medium text-slate-500">Police Operations Center</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative max-w-xs hidden md:block">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-lg">search</span>
                            <input
                                className="input-dark pl-10 py-2 w-60 text-sm"
                                placeholder="Search incidents, officers…"
                                type="text"
                            />
                        </div>
                        <button className="relative p-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] rounded-full transition-colors cursor-pointer">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 size-1.5 bg-red-400 rounded-full shadow-[0_0_4px_rgba(248,113,113,0.8)]" />
                        </button>
                    </div>
                </header>

                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                    {children}
                </div>

                <footer className="py-3 text-center text-[11px] text-slate-700 border-t border-white/[0.04]" style={{ background: 'var(--bg-surface)' }}>
                    © 2026 CivicFlow Platform. Authorized Use Only. Bengaluru City Police IT Division.
                </footer>
            </main>
        </div>
    );
}
