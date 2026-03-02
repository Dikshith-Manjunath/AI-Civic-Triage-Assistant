import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, DEPARTMENTS } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, username, password, department, fullName } = body;

        // Validation
        if (!email || !username || !password || !department) {
            return NextResponse.json(
                { error: 'Email, username, password, and department are required' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // admin is valid, regular departments validated against list
        const isAdminSignup = department === 'admin';
        if (!isAdminSignup) {
            const validDept = DEPARTMENTS.find((d) => d.value === department);
            if (!validDept) {
                return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
            }
        }

        // Determine role and status
        const role = isAdminSignup ? 'admin' : 'officer';
        // Admin users are auto-approved; regular users need approval
        const status = isAdminSignup ? 'approved' : 'pending';

        // Check if user already exists
        const existing = db
            .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
            .get(email, username);

        if (existing) {
            return NextResponse.json(
                { error: 'A user with this email or username already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert user with status
        db.prepare(
            'INSERT INTO users (email, username, password, department, role, status, full_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(email, username, hashedPassword, department, role, status, fullName || null);

        // Non-admin users: redirect to awaiting approval (no JWT issued)
        if (!isAdminSignup) {
            return NextResponse.json(
                {
                    success: true,
                    redirectUrl: '/awaiting-approval',
                    pending: true,
                },
                { status: 201 }
            );
        }

        // Admin users: issue JWT and redirect to /admin
        const { signToken } = await import('@/lib/auth');
        const userId = (db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any).id;
        const token = await signToken({
            userId,
            email,
            username,
            department,
            role,
        });

        const response = NextResponse.json(
            {
                success: true,
                redirectUrl: '/admin',
                user: { id: userId, email, username, department, role, fullName },
            },
            { status: 201 }
        );

        response.cookies.set('civicflow_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('[SIGNUP ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
