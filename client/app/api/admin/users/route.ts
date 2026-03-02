import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { verifyToken, isAdmin } from '@/lib/auth';

/**
 * GET  /api/admin/users          — list all users (admin only)
 * PATCH /api/admin/users         — approve/reject a user (admin only)
 *       body: { userId: number, action: 'approve' | 'reject' }
 */

async function requireAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) return null;
    const user = await verifyToken(token);
    if (!user || !isAdmin(user)) return null;
    return user;
}

export async function GET() {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = db.prepare(
        `SELECT id, email, username, department, role, status, full_name, created_at, last_login
         FROM users
         ORDER BY
            CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
            created_at DESC`
    ).all();

    return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !['approve', 'reject'].includes(action)) {
        return NextResponse.json(
            { error: 'userId and action (approve/reject) are required' },
            { status: 400 }
        );
    }

    // Find user
    const user = db.prepare('SELECT id, status, email, username FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, userId);

    return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, username: user.username, status: newStatus },
    });
}
