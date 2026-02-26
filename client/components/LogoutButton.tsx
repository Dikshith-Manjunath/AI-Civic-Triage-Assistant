'use client';

import { useRouter } from 'next/navigation';

type Props = { compact?: boolean };

export default function LogoutButton({ compact }: Props) {
    const router = useRouter();

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    }

    if (compact) {
        return (
            <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
                <span className="material-symbols-outlined text-base">logout</span>
            </button>
        );
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
