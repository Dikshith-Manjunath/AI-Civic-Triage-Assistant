/* ──────────────────────────────────────────────
   CivicFlow — Sidebar  (black & white, minimal)
   ────────────────────────────────────────────── */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  BarChart3,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react";

const DEPT_NAV = [
  { key: "roads",       label: "Roads" },
  { key: "water",       label: "Water" },
  { key: "electricity", label: "Electricity" },
  { key: "sanitation",  label: "Sanitation" },
  { key: "transport",   label: "Transport" },
  { key: "housing",     label: "Housing" },
  { key: "planning",    label: "Planning" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { session, logout } = useAuth();

  if (!session) return null;

  const isAdmin = session.role === "admin";

  function NavItem({
    href,
    label,
    icon,
  }: {
    href: string;
    label: string;
    icon?: React.ReactNode;
  }) {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
          active
            ? "bg-white/10 text-white"
            : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
        }`}
      >
        {icon ?? <ChevronRight size={14} className="opacity-40" />}
        {label}
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-black text-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black text-xs font-bold">
          C
        </div>
        <span className="text-sm font-semibold tracking-tight">CivicFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-hide">
        {/* Main */}
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            Main
          </p>
          <div className="space-y-0.5">
            <NavItem href="/dashboard" label="Overview" icon={<LayoutDashboard size={15} />} />
            <NavItem href="/dashboard/analytics" label="Analytics" icon={<BarChart3 size={15} />} />
          </div>
        </div>

        {/* Departments */}
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            Departments
          </p>
          <div className="space-y-0.5">
            {DEPT_NAV.map((d) => {
              // Officers only see their own department
              if (!isAdmin && d.key !== session.department) return null;
              return (
                <NavItem
                  key={d.key}
                  href={`/dashboard/${d.key}`}
                  label={d.label}
                />
              );
            })}
          </div>
        </div>

        {/* Admin */}
        {isAdmin && (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              System
            </p>
            <div className="space-y-0.5">
              <NavItem href="/dashboard/admin" label="Admin Panel" icon={<Shield size={15} />} />
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="mb-2">
          <p className="text-xs font-medium text-white truncate">{session.name}</p>
          <p className="text-[10px] text-neutral-500 capitalize">
            {session.role} &middot; {session.department}
          </p>
        </div>
        <button
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
          className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-red-400 transition-colors"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
