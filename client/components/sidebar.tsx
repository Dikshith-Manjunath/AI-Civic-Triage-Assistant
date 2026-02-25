/* ──────────────────────────────────────────────
   CivicFlow — Sidebar  (Stitch match)
   ────────────────────────────────────────────── */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const DEPT_NAV = [
  { key: "roads", label: "Roads", icon: "add_road" },
  { key: "water", label: "Water", icon: "water_drop" },
  { key: "electricity", label: "Electricity", icon: "bolt" },
  { key: "sanitation", label: "Sanitation", icon: "cleaning_services" },
  { key: "transport", label: "Transport", icon: "directions_bus" },
  { key: "housing", label: "Housing", icon: "home" },
  { key: "planning", label: "Planning", icon: "architecture" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const router = useRouter();

  if (!session) return null;

  const isAdmin = session.role === "admin";

  function NavItem({
    href,
    label,
    icon,
  }: {
    href: string;
    label: string;
    icon: string;
  }) {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active
          ? "bg-primary/10 text-primary font-semibold"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
        <span className="text-sm">{label}</span>
      </Link>
    );
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col fixed h-full z-20">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined block">account_balance</span>
        </div>
        <div>
          <h1 className="text-primary dark:text-white font-bold text-lg leading-tight tracking-tight">CivicFlow</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Bengaluru {isAdmin ? 'Admin' : 'Officer'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto scrollbar-hide">
        {/* Main Dashboard - Admin or Officer view */}
        <NavItem href="/dashboard" label="Global Overview" icon="dashboard" />
        <NavItem href="/dashboard/tickets" label="Tickets" icon="confirmation_number" />

        {/* Departments (Only shown for their respective officers or admins wanting isolated views) */}
        {!isAdmin && (
          <NavItem href={`/dashboard/${session.department}`} label="My Department" icon="corporate_fare" />
        )}

        {/* Admin only views */}
        {isAdmin && (
          <>
            <NavItem href="/dashboard/authorities" label="Authorities" icon="account_balance_wallet" />
            <NavItem href="/dashboard/analytics" label="Analytics" icon="query_stats" />
            <NavItem href="/dashboard/audit" label="Audit Log" icon="history_edu" />
          </>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined text-[22px]">settings</span>
          <span className="text-sm">Settings</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
