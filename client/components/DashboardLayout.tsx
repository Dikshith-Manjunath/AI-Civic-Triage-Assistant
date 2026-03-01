import Link from 'next/link';
import LogoutButton from './LogoutButton';

type NavItem = { label: string; icon: string; href: string; active?: boolean };

type Props = {
    dept: string;
    deptLabel: string;
    deptIcon: string;
    deptLogo?: string;
    username: string;
    children: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
    { label: 'Workspace', icon: 'dashboard', href: '#workspace' },
    { label: 'My Tickets', icon: 'confirmation_number', href: '#tickets' },
    { label: 'Reports', icon: 'bar_chart', href: '#reports' },
];

export default function DashboardLayout({ dept, deptLabel, deptIcon, deptLogo, username, children }: Props) {
    return (
        <div className="flex h-screen overflow-hidden bg-[#f6f7f8]">
            {/* ────────────────────────────── Sidebar ─────────────────────────────── */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
                {/* Brand */}
                <div className="p-6 flex items-center gap-3 border-b border-slate-100">
                    {deptLogo ? (
                        <img
                            src={deptLogo}
                            alt={`${deptLabel} logo`}
                            className="size-9 rounded-lg object-cover scale-110 flex-shrink-0"
                        />
                    ) : (
                        <div className="size-9 bg-[#1a2a47] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                            <span className="material-symbols-outlined text-lg">{deptIcon}</span>
                        </div>
                    )}
                    <div>
                        <h1 className="font-bold text-lg text-[#1a2a47] leading-tight">CivicFlow</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{dept.toUpperCase()} Authority</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
                    <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a2a47] text-white shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg">dashboard</span>
                        <span className="text-sm font-semibold">{dept.toUpperCase()} Workspace</span>
                    </a>
                    {NAV_ITEMS.slice(1).map(item => (
                        <a
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">{item.icon}</span>
                            <span className="text-sm font-medium">{item.label}</span>
                        </a>
                    ))}
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-lg">settings</span>
                            <span className="text-sm font-medium">Settings</span>
                        </a>
                    </div>
                </nav>

                {/* Sidebar footer: user info */}
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-[#1a2a47]/10 flex items-center justify-center text-[#1a2a47]">
                            <span className="material-symbols-outlined text-lg">person</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{username}</p>
                            <p className="text-xs text-slate-500 truncate">{deptLabel} Officer</p>
                        </div>
                        <LogoutButton compact />
                    </div>
                </div>
            </aside>

            {/* ── Main Content ─────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 flex-shrink-0">
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                        <Link href="/" className="hover:text-[#1a2a47] transition-colors">Home</Link>
                        <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                        <span className="text-[#1a2a47] font-bold">{dept.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 size-1.5 bg-red-500 rounded-full" />
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
