/* ──────────────────────────────────────────────
   CivicFlow — KPI Card  (minimal B&W)
   ────────────────────────────────────────────── */

import type { ReactNode } from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  sub?: string;
}

export default function KPICard({ label, value, icon, sub }: KPICardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-black tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>}
        </div>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
