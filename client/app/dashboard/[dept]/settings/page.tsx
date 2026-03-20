import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';
import SettingsPanel from '@/components/SettingsPanel';

const DEPT_META: Record<string, { label: string; icon: string; logo: string }> = {
    bbmp:   { label: 'BBMP',   icon: 'corporate_fare',       logo: '/logos/BBMP.jpg' },
    bwssb:  { label: 'BWSSB',  icon: 'water_drop',           logo: '/logos/BWSSB.webp' },
    bescom: { label: 'BESCOM', icon: 'bolt',                  logo: '/logos/BESCOM.png' },
    bmtc:   { label: 'BMTC',   icon: 'directions_bus',        logo: '/logos/BMTC.jpg' },
    bda:    { label: 'BDA',    icon: 'architecture',           logo: '/logos/BDA.png' },
    bcp:    { label: 'BCP',    icon: 'local_police',           logo: '/logos/BCP.jpg' },
    gba:    { label: 'GBA',    icon: 'admin_panel_settings',   logo: '/logos/GBA.jpg' },
};

type Props = { params: Promise<{ dept: string }> };

export default async function SettingsPage({ params }: Props) {
    const { dept } = await params;
    const meta = DEPT_META[dept];
    if (!meta) notFound();

    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) redirect('/login');
    const user = await verifyToken(token);
    if (!user) redirect('/login');
    if (user.role !== 'admin' && user.department !== dept) redirect(`/dashboard/${user.department}`);

    return (
        <DashboardLayout dept={dept} deptLabel={meta.label} deptIcon={meta.icon} deptLogo={meta.logo} username={user.username} activePage="settings">
            <div className="mb-6">
                <h1 className="font-display text-2xl font-800 text-white">Settings</h1>
                <p className="text-sm text-slate-500 mt-1">Manage your profile, notifications, and preferences</p>
            </div>
            <SettingsPanel
                username={user.username}
                email={user.email}
                role={user.role}
                department={dept}
                deptLabel={meta.label}
            />
        </DashboardLayout>
    );
}
