/**
 * CivicFlow API client - communicates with FastAPI backend
 */

import type {
  ComplaintSubmission,
  DashboardKPIs,
  DeptTrend,
  HeatmapData,
  TicketListResponse,
  Ticket,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private base: string;

  constructor(base: string) {
    this.base = base;
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  // ── Complaints ──────────────────────────────────────────────
  async submitComplaint(formData: FormData): Promise<ComplaintSubmission> {
    const res = await fetch(`${this.base}/api/v1/complaints`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
    return res.json();
  }

  // ── Tickets ─────────────────────────────────────────────────
  async getTickets(params?: {
    page?: number;
    page_size?: number;
    department?: string;
    urgency?: number;
    status?: string;
  }): Promise<TicketListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.page_size)
      searchParams.set("page_size", String(params.page_size));
    if (params?.department) searchParams.set("department", params.department);
    if (params?.urgency !== undefined)
      searchParams.set("urgency", String(params.urgency));
    if (params?.status) searchParams.set("status", params.status);

    const qs = searchParams.toString();
    return this.fetch<TicketListResponse>(
      `/api/v1/tickets${qs ? `?${qs}` : ""}`
    );
  }

  async getTicket(id: string): Promise<Ticket> {
    return this.fetch<Ticket>(`/api/v1/tickets/${id}`);
  }

  // ── Dashboard ───────────────────────────────────────────────
  async getKPIs(): Promise<DashboardKPIs> {
    return this.fetch<DashboardKPIs>("/api/v1/dashboard/kpis");
  }

  async getHeatmap(): Promise<HeatmapData> {
    return this.fetch<HeatmapData>("/api/v1/dashboard/heatmap");
  }

  async getDepartmentTrend(): Promise<DeptTrend[]> {
    return this.fetch<DeptTrend[]>("/api/v1/dashboard/department-trend");
  }

  // ── Health ──────────────────────────────────────────────────
  async healthCheck(): Promise<{ status: string }> {
    return this.fetch<{ status: string }>("/health");
  }
}

export const api = new ApiClient(API_BASE);
