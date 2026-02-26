import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('civicflow_token')?.value;
    if (!token) redirect('/login');

    const user = await verifyToken(token);
    if (!user) redirect('/login');

    // Admins go to /admin, officers go to their dept dashboard
    if (user.role === 'admin') redirect('/admin');
    redirect(`/dashboard/${user.department}`);
}
