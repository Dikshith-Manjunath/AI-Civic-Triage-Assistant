import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { email, password, role, department } = await request.json();

        if (!email || !password || !role || !department) {
            return NextResponse.json(
                { error: 'Email, password, role, and department are required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Check if user already exists
        const existingResult = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [email]
        });
        if (existingResult.rows.length > 0) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 409 }
            );
        }

        // Hash the password securely
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate a simple UUID-like ID for the user
        const id = crypto.randomUUID();

        // Insert new user into the database
        await db.execute({
            sql: 'INSERT INTO users (id, email, password, role, department) VALUES (?, ?, ?, ?, ?)',
            args: [id, email, hashedPassword, role, department]
        });

        return NextResponse.json(
            { message: 'User created successfully', id },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error during signup:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
