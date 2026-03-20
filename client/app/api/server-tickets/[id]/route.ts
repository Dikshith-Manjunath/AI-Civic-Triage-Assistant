import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Params = { params: Promise<{ id: string }> };

// ── Status mappings (mirrors the dashboard page) ──
const URGENCY_MAP: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' };
const STATUS_MAP: Record<string, string> = {
    pending: 'open',
    awaiting_approval: 'in_progress',
    approved: 'approved',
    rejected: 'rejected',
    filed: 'dispatched',
    resolved: 'resolved',
};

async function doTransition(ticketId: string, newStatus: string, actedBy: string): Promise<{ ok: boolean; data?: any; error?: string }> {
    const url = `${API_URL}/api/v1/tickets/${encodeURIComponent(ticketId)}/transition`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus, acted_by: actedBy }),
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: errText };
    }
    return { ok: true, data: await res.json() };
}

async function doApprove(ticketId: string, approvedBy: string): Promise<{ ok: boolean; data?: any; error?: string }> {
    const url = `${API_URL}/api/v1/tickets/${encodeURIComponent(ticketId)}/approve`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: approvedBy }),
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: errText };
    }
    return { ok: true, data: await res.json() };
}

async function doReject(ticketId: string, rejectedBy: string): Promise<{ ok: boolean; data?: any; error?: string }> {
    const url = `${API_URL}/api/v1/tickets/${encodeURIComponent(ticketId)}/reject`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: rejectedBy }),
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: errText };
    }
    return { ok: true, data: await res.json() };
}

/**
 * Fetch the current ClickHouse ticket status directly via the complaints endpoint.
 */
async function fetchCurrentStatus(ticketId: string): Promise<string | null> {
    // List all and find by id (the server doesn't have a get-by-id endpoint)
    const res = await fetch(`${API_URL}/api/complaints?limit=500`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const tickets = await res.json();
    const match = (Array.isArray(tickets) ? tickets : []).find((t: any) => t.id === ticketId);
    return match?.status ?? null;
}

/**
 * After an action, refetch the ticket data and return it in the format
 * the TicketDrawer expects: { ticket, events }.
 */
async function refetchTicket(ticketId: string, dept: string): Promise<any | null> {
    const res = await fetch(`${API_URL}/api/complaints/by-dept/${encodeURIComponent(dept)}?limit=500`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const tickets = await res.json();
    const match = (Array.isArray(tickets) ? tickets : []).find((t: any) => t.id === ticketId);
    if (!match) return null;

    const authority = (match.authority || '').toUpperCase();
    const prefix = authority.slice(0, 2) || 'XX';
    return {
        id: match.id,
        ticket_no: `${prefix}-${match.id.slice(0, 4).toUpperCase()}`,
        department: authority.toLowerCase(),
        category: match.dept || 'general',
        title: match.summary || 'Untitled',
        description: match.raw_text || match.reply || null,
        location: null,
        ward: null,
        urgency: URGENCY_MAP[match.urgency] ?? 'medium',
        status: STATUS_MAP[match.status] || match.status || 'open',
        assignee: match.approved_by || null,
        created_by: match.channel || 'web',
        created_at: match.timestamp || new Date().toISOString(),
        updated_at: match.approved_at && match.approved_at !== '1970-01-01T00:00:00'
            ? match.approved_at
            : match.timestamp || new Date().toISOString(),
    };
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const token = request.cookies.get('civicflow_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Return ticket data already loaded from the list — no separate detail endpoint on server
        return NextResponse.json({ ticket: null, events: [] });
    } catch (e: any) {
        console.error('[GET /api/server-tickets/id]', e?.message || e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const token = request.cookies.get('civicflow_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { action } = body;

        // Get current server-side status for multi-step transitions
        const currentStatus = await fetchCurrentStatus(id);
        let result: { ok: boolean; data?: any; error?: string };

        switch (action) {
            case 'review':
                // Move to awaiting_approval (pending → awaiting_approval)
                if (currentStatus === 'pending') {
                    result = await doTransition(id, 'awaiting_approval', user.username);
                } else {
                    result = { ok: false, error: `Cannot review: ticket is '${currentStatus}', expected 'pending'` };
                }
                break;

            case 'approve':
                // Needs to be in awaiting_approval first
                if (currentStatus === 'pending') {
                    // Auto-step: pending → awaiting_approval first
                    const step1 = await doTransition(id, 'awaiting_approval', user.username);
                    if (!step1.ok) { result = step1; break; }
                }
                result = await doApprove(id, user.username);
                break;

            case 'reject':
                // Needs to be in awaiting_approval first
                if (currentStatus === 'pending') {
                    // Auto-step: pending → awaiting_approval first
                    const step1 = await doTransition(id, 'awaiting_approval', user.username);
                    if (!step1.ok) { result = step1; break; }
                }
                result = await doReject(id, user.username);
                break;

            case 'resolve':
                // Walk through the full chain: pending→awa→approved→filed→resolved
                result = { ok: true };
                if (currentStatus === 'pending') {
                    result = await doTransition(id, 'awaiting_approval', user.username);
                    if (!result.ok) break;
                }
                const statusAfterPending = currentStatus === 'pending' ? 'awaiting_approval' : currentStatus;
                if (statusAfterPending === 'awaiting_approval') {
                    result = await doApprove(id, user.username);
                    if (!result.ok) break;
                }
                const statusAfterApproval = (statusAfterPending === 'awaiting_approval') ? 'approved' : statusAfterPending;
                if (statusAfterApproval === 'approved') {
                    result = await doTransition(id, 'filed', user.username);
                    if (!result.ok) break;
                }
                const statusAfterFiled = (statusAfterApproval === 'approved') ? 'filed' : statusAfterApproval;
                if (statusAfterFiled === 'filed') {
                    result = await doTransition(id, 'resolved', user.username);
                }
                break;

            case 'reopen':
                // Reopen not supported by current state machine (terminal states have no transitions)
                // We'll return a UI-only message
                result = { ok: false, error: 'Reopen is not supported for server tickets.' };
                break;

            case 'comment':
                // Comments are not stored in ClickHouse — just acknowledge
                result = { ok: true, data: { message: 'Comment noted (local only)' } };
                break;

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        if (!result!.ok) {
            console.error(`[server-tickets PATCH] action=${action} failed:`, result!.error);
            return NextResponse.json({ error: result!.error || 'Action failed' }, { status: 409 });
        }

        // ClickHouse mutations are async; wait a moment for data to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refetch the updated ticket to return it in the expected format
        // For admins, we must resolve the real dept from the complaint (user.department = 'admin')
        let dept = user.department;
        if (!dept || dept === 'admin') {
            try {
                const listRes = await fetch(`${API_URL}/api/complaints?limit=500`, {
                    cache: 'no-store',
                    signal: AbortSignal.timeout(6000),
                });
                if (listRes.ok) {
                    const allTickets = await listRes.json();
                    const match = (Array.isArray(allTickets) ? allTickets : []).find((t: any) => t.id === id);
                    if (match?.authority) dept = (match.authority as string).toLowerCase();
                }
            } catch { /* fall back to admin — refetch will fail gracefully */ }
        }
        const updatedTicket = await refetchTicket(id, dept);

        if (updatedTicket) {
            return NextResponse.json({ ticket: updatedTicket, events: [], success: true });
        }

        // Couldn't refetch — return the server result with a synthetic ticket update
        return NextResponse.json({
            ticket: null,
            events: [],
            success: true,
            serverResult: result!.data,
        });
    } catch (e: any) {
        console.error('[PATCH /api/server-tickets/id]', e?.message || e);
        return NextResponse.json({ error: 'Failed to perform action on server' }, { status: 500 });
    }
}
