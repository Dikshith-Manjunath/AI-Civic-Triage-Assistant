import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * GET /api/server-tickets/[id]/media
 * Proxy to FastAPI: GET /api/complaints/{id}/media
 * Returns media attachments (images, audio, PDFs) with presigned download URLs.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    try {
        const res = await fetch(
            `${API_URL}/api/complaints/${encodeURIComponent(id)}/media`,
            { cache: 'no-store', signal: AbortSignal.timeout(8000) },
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: `Server returned ${res.status}` },
                { status: res.status },
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[media-proxy] Failed to fetch media:', e?.message || e);
        return NextResponse.json(
            { error: 'Failed to connect to server' },
            { status: 502 },
        );
    }
}
