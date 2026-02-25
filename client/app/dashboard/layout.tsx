/* ──────────────────────────────────────────────
   CivicFlow — Dashboard layout  (sidebar + auth guard)
   ────────────────────────────────────────────── */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/sidebar";
import { Bell, Search } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="w-96">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-500 outline-none transition-all"
                placeholder="Search authorities, tickets, or audit logs..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">notifications</span>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent-danger rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:border-slate-800 mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-semibold leading-none">{session.name}</p>
                <p className="text-xs text-slate-500 mt-1 capitalize">{session.role} • {session.department}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-slate-400">person</span>
              </div>
            </div>
          </div>
        </header>
        {/* Main Content Area */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
