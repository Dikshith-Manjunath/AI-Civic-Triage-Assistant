'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
    const router = useRouter();

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    }

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors"
        >
            <span className="material-symbols-outlined text-base">logout</span>
            Sign Out
        </button>
    );
}
