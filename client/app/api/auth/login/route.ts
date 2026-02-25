import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { signToken, comparePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, department } = body;

        if (!email || !password || !department) {
            return NextResponse.json(
                { error: 'Email, password, and department are required' },
                { status: 400 }
            );
        }

        // Find user by email or username
        const user = db
            .prepare('SELECT * FROM users WHERE email = ? OR username = ?')
            .get(email, email) as any;

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Verify department matches (admin users always match)
        if (user.department !== department) {
            return NextResponse.json(
                { error: 'Credentials do not match the selected department' },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Update last login
        db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

        // Sign JWT
        const token = await signToken({
            userId: user.id,
            email: user.email,
            username: user.username,
            department: user.department,
            role: user.role,
        });

        // Determine redirect URL based on role
        const redirectUrl = user.role === 'admin' ? '/admin' : '/dashboard';

        const response = NextResponse.json({
            success: true,
            redirectUrl,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                department: user.department,
                role: user.role,
                fullName: user.full_name,
            },
        });

        // Set cookie (httpOnly, secure in production)
        response.cookies.set('civicflow_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
