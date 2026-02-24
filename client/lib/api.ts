/* ──────────────────────────────────────────────────────────────
   CivicFlow — API client  (matches actual FastAPI endpoints)
   ────────────────────────────────────────────────────────────── */

import type { Ticket, SimilarComplaint } from "./types";

const BASE = "";  // Next.js rewrites /api/* → FastAPI

/* ── Complaints ── */

export async function fetchComplaints(limit = 200): Promise<Ticket[]> {
  const res = await fetch(`${BASE}/api/complaints?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch complaints: ${res.status}`);
  return res.json();
}

export interface SubmitComplaintPayload {
  text: string;
  channel?: string;
  image?: File;
  audio?: File;
  pdf?: File;
}

export async function submitComplaint(payload: SubmitComplaintPayload): Promise<Ticket> {
  const fd = new FormData();
  fd.append("text", payload.text);
  fd.append("channel", payload.channel ?? "dashboard");
  if (payload.image) fd.append("image", payload.image);
  if (payload.audio) fd.append("audio", payload.audio);
  if (payload.pdf)   fd.append("pdf", payload.pdf);
  const res = await fetch(`${BASE}/api/complaints`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Failed to submit complaint: ${res.status}`);
  return res.json();
}

/* ── Ticket actions (lifecycle state machine) ── */

export async function approveTicket(id: string, approvedBy: string) {
  const res = await fetch(`${BASE}/api/v1/tickets/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved_by: approvedBy }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Approve failed: ${res.status}`);
  }
  return res.json();
}

export async function rejectTicket(id: string, rejectedBy: string) {
  const res = await fetch(`${BASE}/api/v1/tickets/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved_by: rejectedBy }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Reject failed: ${res.status}`);
  }
  return res.json();
}

export async function transitionTicket(id: string, newStatus: string, actedBy = "dashboard") {
  const res = await fetch(`${BASE}/api/v1/tickets/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_status: newStatus, acted_by: actedBy }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Transition failed: ${res.status}`);
  }
  return res.json();
}

/* ── Similarity ── */

export async function fetchSimilar(id: string): Promise<SimilarComplaint[]> {
  const res = await fetch(`${BASE}/api/v1/complaints/${id}/similar`);
  if (!res.ok) throw new Error(`Failed to fetch similar: ${res.status}`);
  return res.json();
}
