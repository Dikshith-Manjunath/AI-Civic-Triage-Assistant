import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('civicflow_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const dept = request.nextUrl.searchParams.get('dept') || user.department;
        // Admin can query any department; officers can only query their own
        if (user.role !== 'admin' && dept !== user.department) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const tickets = db.prepare(
            `SELECT * FROM tickets WHERE department = ? ORDER BY
         CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         created_at DESC`
        ).all(dept);

        return NextResponse.json({ tickets });
    } catch (e) {
        console.error('[GET /api/tickets]', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('civicflow_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { category, title, description, location, ward, urgency } = body;
        if (!category || !title) {
            return NextResponse.json({ error: 'category and title are required' }, { status: 400 });
        }

        const prefix = user.department.toUpperCase().slice(0, 2);
        const num = Date.now().toString().slice(-4);
        const ticket_no = `${prefix}-${num}`;

        const result = db.prepare(`
      INSERT INTO tickets (ticket_no, department, category, title, description, location, ward, urgency, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(ticket_no, user.department, category, title, description ?? null, location ?? null, ward ?? null, urgency ?? 'medium', user.username);

        const ticketId = result.lastInsertRowid as number;
        db.prepare(`INSERT INTO ticket_events (ticket_id, action, actor, note) VALUES (?, 'created', ?, ?)`).run(ticketId, user.username, 'Ticket created');

        const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
        return NextResponse.json({ ticket }, { status: 201 });
    } catch (e) {
        console.error('[POST /api/tickets]', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
