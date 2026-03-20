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
            <div className="rounded-2xl border border-white/[0.07] p-10 text-center" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex justify-center mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E]/10">
                        <span className="material-symbols-outlined text-3xl text-[#22C55E]" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                    </div>
                </div>
                <p className="text-slate-300 font-semibold">No pending approvals</p>
                <p className="text-xs text-slate-600 mt-1">New user registrations will appear here</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {users.map((u) => (
                <div
                    key={u.id}
                    className="rounded-xl border border-white/[0.07] p-5 flex items-center gap-4 transition-all hover:border-white/[0.12]"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    {/* Avatar */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316]">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-white">{u.full_name || u.username}</p>
                            <span className="rounded-full bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                Pending
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{u.email}</p>
                        <div className="flex gap-3 mt-1.5 text-[11px] text-slate-600">
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
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/25 text-sm font-semibold rounded-lg hover:bg-[#22C55E]/25 transition-colors disabled:opacity-50 cursor-pointer"
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
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20 text-sm font-semibold rounded-lg hover:bg-[#F87171]/20 transition-colors disabled:opacity-50 cursor-pointer"
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
