import { URGENCY_CONFIG, STATUS_CONFIG, DEPT_CONFIG } from "@/lib/types";
import type { UrgencyLevel, TicketStatus, Department } from "@/lib/types";

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  const config = URGENCY_CONFIG[level];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
    >
      {config.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.received;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
    >
      {config.label}
    </span>
  );
}

export function DeptBadge({ department }: { department: Department }) {
  const config = DEPT_CONFIG[department] || DEPT_CONFIG.general;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
