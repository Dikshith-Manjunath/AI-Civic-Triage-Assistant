import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-civicflow';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Find the user by email
        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [email]
        });
        const user = result.rows[0] as any; // Cast for generic row fields accessing

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify the password securely
        const isPasswordValid = await bcrypt.compare(password, user.password as string);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                department: user.department
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return the session cleanly
        return NextResponse.json(
            {
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.email.split('@')[0], // derived name fallback
                    role: user.role,
                    department: user.department
                }
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error during login:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
