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
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
                <span className="material-symbols-outlined text-base">logout</span>
            </button>
        );
    }

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
        >
            <span className="material-symbols-outlined text-base">logout</span>
            Sign Out
        </button>
    );
}
