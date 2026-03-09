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
        <div className="flex h-screen overflow-hidden bg-[#f6f7f8] font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white hidden lg:flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <img
                        alt="BCP Emblem"
                        className="h-10 w-10 object-contain"
                        src="/logos/BCP.jpg"
                    />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Department</span>
                        <span className="text-sm font-bold text-[#1a2a47] leading-tight">Bengaluru City Police</span>
                    </div>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-1">
                    {/* Dashboard Navigation rendered inside layout to allow linking */}
                    <Link href="/dashboard/bcp" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1a2a47]/10 border-r-4 border-[#1a2a47] text-[#1a2a47] font-semibold">
                        <span className="material-symbols-outlined text-[22px]">dashboard</span>
                        <span className="text-sm">Dashboard</span>
                    </Link>
                    <Link href="/dashboard/bcp/reports" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-[22px]">analytics</span>
                        <span className="text-sm">Reports & Charts</span>
                    </Link>
                    <Link href="/dashboard/bcp" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
                        <span className="text-sm">Incident Tickets</span>
                    </Link>
                    <span className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 cursor-not-allowed">
                        <span className="material-symbols-outlined text-[22px]">shield_person</span>
                        <span className="text-sm">Patrol Status</span>
                        <span className="ml-auto text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">Soon</span>
                    </span>
                </nav>
                <div className="p-4 border-t border-slate-200">
                    <LogoutButton />

                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1a2a47]/20 flex items-center justify-center text-[#1a2a47] font-bold text-xs uppercase">
                                {initials}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold truncate w-32">{user.username}</span>
                                <span className="text-[10px] text-slate-500 uppercase">{user.role}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-y-auto bg-[#f6f7f8]">
                {/* Top Navigation */}
                <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-[#1a2a47] p-1.5 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
                                </svg>
                            </div>
                            <h1 className="text-lg font-bold tracking-tight text-[#1a2a47]">CivicFlow</h1>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
                        <span className="text-sm font-medium text-slate-500">Police Operations Center</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative max-w-xs hidden md:block">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input className="pl-10 pr-4 py-2 bg-slate-100 border-transparent outline-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#1a2a47]/20" placeholder="Search incidents, officers..." type="text" />
                        </div>
                        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border-2 border-white"></span>
                        </button>
                        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                            <span className="material-symbols-outlined">help</span>
                        </button>
                    </div>
                </header>

                <div className="p-6 flex-1 flex flex-col">
                    {children}
                </div>

                {/* Global Footer */}
                <footer className="p-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white mt-auto">
                    © 2026 CivicFlow Platform. Authorized Use Only. Bengaluru City Police IT Division.
                </footer>
            </main>
        </div>
    );
}
