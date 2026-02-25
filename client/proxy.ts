import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'civicflow-super-secret-jwt-key-change-in-production'
);

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/admin'];
// Routes only for unauthenticated users
const AUTH_ROUTES = ['/login', '/signup'];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('civicflow_token')?.value;

    const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
    const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
    const isAdminRoute = pathname.startsWith('/admin');

    if (isProtected) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            // Non-admins cannot access /admin
            if (isAdminRoute && payload.role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        } catch {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('civicflow_token');
            return response;
        }
    }

    if (isAuthRoute && token) {
        try {
            await jwtVerify(token, JWT_SECRET);
            return NextResponse.redirect(new URL('/dashboard', request.url));
        } catch {
            // Invalid token — let them access auth routes
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/signup'],
};
