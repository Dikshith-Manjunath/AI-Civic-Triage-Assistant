import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';
import ReportsCharts from '@/components/ReportsCharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const URGENCY_MAP: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' };
const STATUS_MAP: Record<string, string> = {
    pending: 'open', awaiting_approval: 'in_progress', approved: 'approved',
    rejected: 'rejected', filed: 'dispatched', resolved: 'resolved',
};

const DEPT_META: Record<string, { label: string; icon: string; logo: string }> = {
    bbmp:   { label: 'BBMP',   icon: 'corporate_fare',       logo: '/logos/BBMP.jpg' },
    bwssb:  { label: 'BWSSB',  icon: 'water_drop',           logo: '/logos/BWSSB.webp' },
    bescom: { label: 'BESCOM', icon: 'bolt',                  logo: '/logos/BESCOM.png' },
    bmtc:   { label: 'BMTC',   icon: 'directions_bus',        logo: '/logos/BMTC.jpg' },
    bda:    { label: 'BDA',    icon: 'architecture',           logo: '/logos/BDA.png' },
    bcp:    { label: 'BCP',    icon: 'local_police',           logo: '/logos/BCP.jpg' },
    gba:    { label: 'GBA',    icon: 'admin_panel_settings',   logo: '/logos/GBA.jpg' },
};

function transformTicket(t: any, idx: number) {
    const authority = (t.authority || '').toUpperCase();
    const prefix = authority.slice(0, 2) || 'XX';
    return {
        id: t.id,
        ticket_no: `${prefix}-${String(idx + 1).padStart(4, '0')}`,
        department: (t.authority || '').toLowerCase(),
        category: t.dept || 'general',
        title: t.summary || 'Untitled',
        description: t.raw_text || t.reply || null,
        location: null, ward: null,
        urgency: URGENCY_MAP[t.urgency] ?? 'medium',
        status: STATUS_MAP[t.status] || t.status || 'open',
        assignee: t.approved_by || null,
        created_by: t.channel || 'web',
        created_at: t.timestamp || new Date().toISOString(),
        updated_at: t.approved_at && t.approved_at !== '1970-01-01T00:00:00' ? t.approved_at : t.timestamp || new Date().toISOString(),
    };
}

type Props = { params: Promise<{ dept: string }> };

export default async function ReportsPage({ params }: Props) {
    const { dept } = await params;
    const meta = DEPT_META[dept];
    if (!meta) notFound();

    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) redirect('/login');
    const user = await verifyToken(token);
    if (!user) redirect('/login');
    if (user.role !== 'admin' && user.department !== dept) redirect(`/dashboard/${user.department}`);

    let tickets: any[] = [];
    try {
        const res = await fetch(
            `${API_URL}/api/complaints/by-dept/${encodeURIComponent(dept)}?limit=500`,
            { cache: 'no-store', signal: AbortSignal.timeout(8000) },
        );
        if (res.ok) {
            const data = await res.json();
            tickets = (Array.isArray(data) ? data : []).map(transformTicket);
        }
    } catch { /* empty */ }

    return (
        <DashboardLayout dept={dept} deptLabel={meta.label} deptIcon={meta.icon} deptLogo={meta.logo} username={user.username} activePage="reports">
            <div className="mb-6">
                <h1 className="font-display text-2xl font-800 text-white">Reports & Analytics</h1>
                <p className="text-sm text-slate-500 mt-1">Performance metrics and complaint intelligence for {meta.label}</p>
            </div>
            <ReportsCharts tickets={tickets} dept={dept} deptLabel={meta.label} />
        </DashboardLayout>
    );
}
