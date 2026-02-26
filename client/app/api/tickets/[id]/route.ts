import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const token = request.cookies.get('civicflow_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(id)) as any;
        if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (user.role !== 'admin' && ticket.department !== user.department) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const events = db.prepare('SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at ASC').all(Number(id));
        return NextResponse.json({ ticket, events });
    } catch (e) {
        console.error('[GET /api/tickets/id]', e);
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

        const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(id)) as any;
        if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (user.role !== 'admin' && ticket.department !== user.department) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { action, note, assignee } = body;

        const statusMap: Record<string, string> = {
            approve: 'approved',
            reject: 'rejected',
            resolve: 'resolved',
            rectify: 'in_progress',
            dispatch: 'dispatched',
            reopen: 'open',
        };

        const newStatus = statusMap[action];
        if (!newStatus) {
            return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        db.prepare(`
      UPDATE tickets SET status = ?, assignee = COALESCE(?, assignee), updated_at = datetime('now') WHERE id = ?
    `).run(newStatus, assignee ?? null, Number(id));

        db.prepare(`
      INSERT INTO ticket_events (ticket_id, action, actor, note) VALUES (?, ?, ?, ?)
    `).run(Number(id), action, user.username, note ?? null);

        const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(id));
        const events = db.prepare('SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at ASC').all(Number(id));
        return NextResponse.json({ ticket: updated, events });
    } catch (e) {
        console.error('[PATCH /api/tickets/id]', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
