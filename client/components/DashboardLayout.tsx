import Link from 'next/link';
import LogoutButton from './LogoutButton';

type Props = {
    dept: string;
    deptLabel: string;
    deptIcon: string;
    deptLogo?: string;
    username: string;
    children: React.ReactNode;
    activePage?: 'workspace' | 'reports' | 'settings';
};

export default function DashboardLayout({ dept, deptLabel, deptIcon, deptLogo, username, children, activePage = 'workspace' }: Props) {
    const navItems = [
        { label: `${dept.toUpperCase()} Workspace`, icon: 'dashboard', href: `/dashboard/${dept}`, key: 'workspace' as const },
        { label: 'Reports & Analytics', icon: 'bar_chart', href: `/dashboard/${dept}/reports`, key: 'reports' as const },
        { label: 'Settings', icon: 'settings', href: `/dashboard/${dept}/settings`, key: 'settings' as const },
    ];

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
            {/* ── Sidebar ── */}
            <aside className="w-64 flex-shrink-0 flex flex-col border-r border-white/[0.06]" style={{ background: 'var(--bg-surface)' }}>
                {/* Brand */}
                <div className="p-5 flex items-center gap-3 border-b border-white/[0.06]">
                    {deptLogo ? (
                        <img
                            src={deptLogo}
                            alt={`${deptLabel} logo`}
                            className="size-9 rounded-xl object-cover scale-110 flex-shrink-0 ring-1 ring-white/10"
                        />
                    ) : (
                        <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] text-[#020617]">
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{deptIcon}</span>
                        </div>
                    )}
                    <div>
                        <h1 className="font-display font-700 text-base text-white leading-tight">Civic<span className="text-[#38BDF8]">Flow</span></h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mt-0.5">{dept.toUpperCase()} Authority</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = activePage === item.key;
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                                    isActive
                                        ? 'text-white font-semibold'
                                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 font-medium'
                                }`}
                                style={isActive ? { background: 'rgba(56,189,248,0.1)', borderLeft: '2px solid #38BDF8' } : {}}
                            >
                                <span
                                    className={`material-symbols-outlined text-lg ${isActive ? 'text-[#38BDF8]' : ''}`}
                                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                                >
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User chip */}
                <div className="p-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="size-8 rounded-full bg-gradient-to-br from-[#38BDF8]/20 to-[#818CF8]/20 border border-white/10 flex items-center justify-center text-[#38BDF8] flex-shrink-0">
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate">{username}</p>
                            <p className="text-[10px] text-slate-500 truncate">{deptLabel} Officer</p>
                        </div>
                        <LogoutButton compact />
                    </div>
                </div>
            </aside>

            {/* ── Main Area ── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top header */}
                <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-8 z-10 flex-shrink-0" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(16px)' }}>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                        <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
                        <span className="material-symbols-outlined text-slate-700 text-lg">chevron_right</span>
                        <Link href={`/dashboard/${dept}`} className="hover:text-slate-300 transition-colors">{dept.toUpperCase()}</Link>
                        {activePage !== 'workspace' && (
                            <>
                                <span className="material-symbols-outlined text-slate-700 text-lg">chevron_right</span>
                                <span className="text-[#38BDF8] font-bold capitalize">{activePage}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="relative p-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] rounded-full transition-colors cursor-pointer">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 size-1.5 bg-red-400 rounded-full shadow-[0_0_4px_rgba(248,113,113,0.8)]" />
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
