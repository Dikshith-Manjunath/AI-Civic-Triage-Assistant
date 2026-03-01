import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Urgency int → string mapping ──
const URGENCY_MAP: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' };

// ── Server status → client status mapping ──
const STATUS_MAP: Record<string, string> = {
    pending: 'open',
    awaiting_approval: 'in_progress',
    approved: 'approved',
    rejected: 'rejected',
    filed: 'dispatched',
    resolved: 'resolved',
};

/**
 * Transform a server-side ClickHouse ticket into the shape expected
 * by the client's TicketTable / TicketDrawer components.
 */
function transformTicket(t: any, idx: number) {
    const authority = (t.authority || '').toUpperCase();
    const prefix = authority.slice(0, 2) || 'XX';
    const ticketNo = `${prefix}-${String(idx + 1).padStart(4, '0')}`;

    return {
        id: t.id,
        ticket_no: ticketNo,
        department: (t.authority || '').toLowerCase(),
        category: t.dept || 'general',
        title: t.summary || 'Untitled',
        description: t.raw_text || t.reply || null,
        location: null,
        ward: null,
        urgency: URGENCY_MAP[t.urgency] || 'medium',
        status: STATUS_MAP[t.status] || t.status || 'open',
        assignee: t.approved_by || null,
        created_by: t.channel || 'web',
        created_at: t.timestamp || new Date().toISOString(),
        updated_at: t.approved_at && t.approved_at !== '1970-01-01T00:00:00'
            ? t.approved_at
            : t.timestamp || new Date().toISOString(),
    };
}

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('civicflow_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const dept = request.nextUrl.searchParams.get('dept') || user.department;
        // Officers can only view their own dept; admins can query any
        if (user.role !== 'admin' && dept !== user.department) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const res = await fetch(`${API_URL}/api/complaints/by-dept/${encodeURIComponent(dept)}?limit=200`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            console.error(`[server-tickets] upstream ${res.status}: ${await res.text()}`);
            return NextResponse.json({ tickets: [], error: 'Server unavailable' });
        }

        const data = await res.json();
        const tickets = (Array.isArray(data) ? data : []).map(transformTicket);

        return NextResponse.json({ tickets });
    } catch (e: any) {
        console.error('[GET /api/server-tickets]', e?.message || e);
        // Graceful fallback — return empty array so dashboard doesn't crash
        return NextResponse.json({ tickets: [], error: 'Failed to fetch from server' });
    }
}
