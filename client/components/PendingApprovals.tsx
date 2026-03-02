'use client';

import { useState } from 'react';

type PendingUser = {
    id: number;
    email: string;
    username: string;
    department: string;
    role: string;
    full_name: string | null;
    created_at: string;
};

export default function PendingApprovals({ initialUsers }: { initialUsers: PendingUser[] }) {
    const [users, setUsers] = useState<PendingUser[]>(initialUsers);
    const [loading, setLoading] = useState<number | null>(null);

    async function handleAction(userId: number, action: 'approve' | 'reject') {
        setLoading(userId);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action }),
            });
            if (res.ok) {
                setUsers((prev) => prev.filter((u) => u.id !== userId));
            }
        } catch (e) {
            console.error('Failed to update user:', e);
        }
        setLoading(null);
    }

    if (users.length === 0) {
        return (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">how_to_reg</span>
                <p className="text-slate-500 font-medium">No pending approvals</p>
                <p className="text-xs text-slate-400 mt-1">New user registrations will appear here</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {users.map((u) => (
                <div
                    key={u.id}
                    className="rounded-xl bg-white border border-slate-100 shadow-sm p-5 flex items-center gap-4"
                >
                    {/* Avatar */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600">
                        <span className="material-symbols-outlined text-lg">person</span>
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900">{u.full_name || u.username}</p>
                            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold">
                                Pending
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{u.email}</p>
                        <div className="flex gap-3 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">corporate_fare</span>
                                {u.department.toUpperCase()}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">schedule</span>
                                {new Date(u.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => handleAction(u.id, 'approve')}
                            disabled={loading === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {loading === u.id ? (
                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">check</span>
                            )}
                            Approve
                        </button>
                        <button
                            onClick={() => handleAction(u.id, 'reject')}
                            disabled={loading === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Reject
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
