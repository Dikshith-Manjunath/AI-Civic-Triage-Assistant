import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'civicflow-super-secret-jwt-key-change-in-production'
);
const JWT_EXPIRY = '8h'; // 8-hour sessions

export interface JWTPayload {
    userId: number;
    email: string;
    username: string;
    department: string;
    role: string;
    iat?: number;
    exp?: number;
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export const DEPARTMENTS = [
    { value: 'bbmp', label: 'BBMP', fullName: 'Bruhat Bengaluru Mahanagara Palike' },
    { value: 'bwssb', label: 'BWSSB', fullName: 'Bangalore Water Supply & Sewerage Board' },
    { value: 'bescom', label: 'BESCOM', fullName: 'Bangalore Electricity Supply Company' },
    { value: 'bmtc', label: 'BMTC', fullName: 'Bangalore Metropolitan Transport Corp' },
    { value: 'bda', label: 'BDA', fullName: 'Bangalore Development Authority' },
    { value: 'bcp', label: 'BCP', fullName: 'Bengaluru City Police' },
    { value: 'gba', label: 'GBA', fullName: 'Governing Body Authority' },
] as const;

export type Department = typeof DEPARTMENTS[number]['value'];

export function isAdmin(user: Pick<JWTPayload, 'role' | 'department'>): boolean {
    return user.role === 'admin' || user.department === 'admin';
}
