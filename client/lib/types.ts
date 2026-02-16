/**
 * CivicFlow API client types
 */

export type MediaType = "text" | "audio" | "image" | "pdf";

export type UrgencyLevel = 0 | 1 | 2;

export type TicketStatus =
  | "received"
  | "processing"
  | "triaged"
  | "assigned"
  | "resolved";

export type Department =
  | "water"
  | "roads"
  | "sanitation"
  | "electricity"
  | "parks"
  | "building"
  | "traffic"
  | "public_health"
  | "general";

export interface Ticket {
  id: string;
  timestamp: string;
  department: Department;
  urgency: UrgencyLevel;
  summary: string;
  location_lat: number | null;
  location_lon: number | null;
  status: TicketStatus;
  channel: string;
  citizen_reply: string | null;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardKPIs {
  total_complaints: number;
  open_complaints: number;
  avg_resolution_hours: number;
  urgency_distribution: Record<string, number>;
  department_distribution: Record<string, number>;
  daily_trend: { date: string; count: number }[];
}

export interface GeoPoint {
  lat: number;
  lon: number;
  complaint_id: string;
  urgency: UrgencyLevel;
  department: Department;
  summary: string;
}

export interface HeatmapData {
  points: GeoPoint[];
}

export interface ComplaintSubmission {
  ticket_id: string;
  status: string;
  message: string;
}

export interface DeptTrend {
  date: string;
  department: string;
  count: number;
}

// Urgency labels & colors
export const URGENCY_CONFIG: Record<
  UrgencyLevel,
  { label: string; color: string; bg: string }
> = {
  0: { label: "Low", color: "text-green-700", bg: "bg-green-100" },
  1: { label: "Medium", color: "text-yellow-700", bg: "bg-yellow-100" },
  2: { label: "High", color: "text-red-700", bg: "bg-red-100" },
};

// Department display config
export const DEPT_CONFIG: Record<
  Department,
  { label: string; icon: string; color: string }
> = {
  water: { label: "Water", icon: "💧", color: "#3b82f6" },
  roads: { label: "Roads", icon: "🛣️", color: "#8b5cf6" },
  sanitation: { label: "Sanitation", icon: "🗑️", color: "#10b981" },
  electricity: { label: "Electricity", icon: "⚡", color: "#f59e0b" },
  parks: { label: "Parks", icon: "🌳", color: "#22c55e" },
  building: { label: "Building", icon: "🏗️", color: "#6366f1" },
  traffic: { label: "Traffic", icon: "🚦", color: "#ef4444" },
  public_health: { label: "Public Health", icon: "🏥", color: "#ec4899" },
  general: { label: "General", icon: "📋", color: "#6b7280" },
};

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; color: string; bg: string }
> = {
  received: { label: "Received", color: "text-gray-700", bg: "bg-gray-100" },
  processing: {
    label: "Processing",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  triaged: {
    label: "Triaged",
    color: "text-purple-700",
    bg: "bg-purple-100",
  },
  assigned: {
    label: "Assigned",
    color: "text-orange-700",
    bg: "bg-orange-100",
  },
  resolved: {
    label: "Resolved",
    color: "text-green-700",
    bg: "bg-green-100",
  },
};
