/* ──────────────────────────────────────────────────────────────
   CivicFlow — Canonical types  (aligned with backend models)
   ────────────────────────────────────────────────────────────── */

export type Department =
  | "roads"
  | "sanitation"
  | "water"
  | "electricity"
  | "transport"
  | "housing"
  | "planning";

export type TicketStatus =
  | "pending"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "filed"
  | "resolved";

export type UrgencyLevel = 0 | 1 | 2;

export type UserRole = "officer" | "admin";

/* ── Core ticket — matches backend TicketResponse exactly ── */
export interface Ticket {
  id: string;
  timestamp: string;
  dept: Department;
  authority: string;
  urgency: number;
  summary: string;
  reply: string;
  status: TicketStatus;
  media?: MediaItem[];
}

export interface MediaItem {
  type: "image" | "audio" | "pdf";
  url: string;
}

/* ── Similar complaint from /api/v1/complaints/{id}/similar ── */
export interface SimilarComplaint {
  id: string;
  summary: string;
  dept: string;
  authority: string;
  urgency: number;
  score: number;
}

/* ── Session stored in localStorage ── */
export interface UserSession {
  name: string;
  department: Department;
  role: UserRole;
}

/* ── Lookup tables ── */
export const DEPARTMENTS: Record<Department, string> = {
  roads: "Roads & Infrastructure",
  water: "Water Supply",
  electricity: "Electricity",
  sanitation: "Sanitation",
  transport: "Transport",
  housing: "Housing",
  planning: "Urban Planning",
};

export const DEPT_LIST: Department[] = [
  "roads",
  "water",
  "electricity",
  "sanitation",
  "transport",
  "housing",
  "planning",
];

export const STATUS_META: Record<TicketStatus, { label: string; className: string; color?: string }> = {
  pending: { label: "Pending", className: "bg-neutral-200 text-neutral-700", color: "blue" },
  awaiting_approval: { label: "Awaiting Approval", className: "bg-amber-100 text-amber-800", color: "yellow" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800", color: "green" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800", color: "red" },
  filed: { label: "Filed", className: "bg-sky-100 text-sky-800", color: "slate" },
  resolved: { label: "Resolved", className: "bg-emerald-200 text-emerald-900", color: "green" },
};

export const URGENCY_META: Record<number, { label: string; className: string }> = {
  0: { label: "Low", className: "bg-neutral-200 text-neutral-600" },
  1: { label: "Medium", className: "bg-amber-100 text-amber-700" },
  2: { label: "High", className: "bg-red-100 text-red-700" },
};

export const AUTHORITIES = [
  "BBMP", "GBA", "BWSSB", "BESCOM", "BMTC", "BEML", "BDA", "BMRDA", "KSDB",
] as const;
