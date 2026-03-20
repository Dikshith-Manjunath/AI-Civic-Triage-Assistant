'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';

const DEPARTMENTS = [
    { value: 'bbmp', label: 'BBMP — Bruhat Bengaluru Mahanagara Palike' },
    { value: 'bwssb', label: 'BWSSB — Water Supply & Sewerage Board' },
    { value: 'bescom', label: 'BESCOM — Electricity Supply Company' },
    { value: 'bmtc', label: 'BMTC — Metropolitan Transport Corp' },
    { value: 'bda', label: 'BDA — Bangalore Development Authority' },
    { value: 'bcp', label: 'BCP — Bengaluru City Police' },
    { value: 'gba', label: 'GBA — Governing Body Authority' },
];

const ADMIN_OPTION = { value: 'admin', label: 'System Administrator' };

export default function LoginPage() {
    const router = useRouter();
    const [tab, setTab] = useState<'login' | 'signup'>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [loginForm, setLoginForm] = useState({ email: '', password: '', department: '' });
    const [signupForm, setSignupForm] = useState({ fullName: '', email: '', username: '', password: '', department: '' });

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!loginForm.email || !loginForm.password || !loginForm.department) {
            setError('All fields are required');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Login failed');
            } else {
                router.push(data.redirectUrl || '/dashboard');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!signupForm.email || !signupForm.username || !signupForm.password || !signupForm.department) {
            setError('All required fields must be filled');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupForm),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Signup failed');
            } else {
                router.push(data.redirectUrl || '/dashboard');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
            {/* Background glows */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#38BDF8]/5 blur-[120px]" />
                <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#818CF8]/6 blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#0F172A]/60 blur-[80px]" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] text-[#020617] shadow-[0_0_16px_rgba(56,189,248,0.2)] transition-all group-hover:shadow-[0_0_24px_rgba(56,189,248,0.35)] group-hover:scale-105">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                    </div>
                    <span className="font-display text-lg font-700 text-white">Civic<span className="text-[#38BDF8]">Flow</span></span>
                </Link>
                <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back to Home
                </Link>
            </div>

            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 py-8">
                <div className="w-full max-w-[460px] animate-fade-in-up">
                    {/* Card */}
                    <div className="rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.5)]" style={{ background: 'var(--bg-surface)' }}>
                        {/* Card Header */}
                        <div className="pt-8 pb-5 px-8 flex flex-col items-center border-b border-white/[0.06]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 flex items-center justify-center bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] rounded-xl text-[#020617] shadow-[0_0_16px_rgba(56,189,248,0.3)]">
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                                </div>
                                <h1 className="font-display text-2xl font-700 text-white tracking-tight">CivicFlow</h1>
                            </div>
                            <h2 className="text-white text-base font-semibold">
                                {tab === 'login' ? 'Official Portal Login' : 'Create Official Account'}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1 text-center">
                                {tab === 'login'
                                    ? 'Enter your credentials to access the dashboard'
                                    : 'Register with your government credentials'}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex mx-8 mt-5 mb-2 rounded-xl p-1 border border-white/[0.06]" style={{ background: 'var(--bg-elevated)' }}>
                            <button
                                onClick={() => { setTab('login'); setError(''); }}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                                    tab === 'login'
                                        ? 'bg-[#38BDF8] text-[#020617] shadow-[0_2px_8px_rgba(56,189,248,0.3)]'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => { setTab('signup'); setError(''); }}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                                    tab === 'signup'
                                        ? 'bg-[#38BDF8] text-[#020617] shadow-[0_2px_8px_rgba(56,189,248,0.3)]'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                Register
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mx-8 mt-3 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.08)' }}>
                                <span className="material-symbols-outlined text-red-400 text-base">error</span>
                                <p className="text-sm text-red-300 font-medium">{error}</p>
                            </div>
                        )}

                        {/* ── LOGIN FORM ── */}
                        {tab === 'login' && (
                            <form onSubmit={handleLogin} className="px-8 pb-8 pt-4 space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Select Authority</label>
                                    <div className="relative">
                                        <select
                                            value={loginForm.department}
                                            onChange={(e) => setLoginForm({ ...loginForm, department: e.target.value })}
                                            className="input-dark appearance-none pr-10 cursor-pointer"
                                            style={{ background: 'var(--bg-elevated)', color: loginForm.department ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                        >
                                            <option value="" disabled>Choose your department</option>
                                            <option value={ADMIN_OPTION.value}>{ADMIN_OPTION.label}</option>
                                            <option disabled>──────────────────</option>
                                            {DEPARTMENTS.map((d) => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <span className="material-symbols-outlined text-xl">expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Username / Email</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. johndoe@karnataka.gov.in"
                                        value={loginForm.email}
                                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                        className="input-dark"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={loginForm.password}
                                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                            className="input-dark pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-xl">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end">
                                    <button type="button" className="text-xs font-semibold text-[#38BDF8] hover:text-[#7DD3FC] transition-colors cursor-pointer">
                                        Forgot Password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-accent w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Authenticating…
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">lock</span>
                                            Secure Login
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* ── SIGNUP FORM ── */}
                        {tab === 'signup' && (
                            <form onSubmit={handleSignup} className="px-8 pb-8 pt-4 space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Full Name <span className="normal-case tracking-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Rajesh Kumar"
                                        value={signupForm.fullName}
                                        onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                                        className="input-dark"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Select Authority *</label>
                                    <div className="relative">
                                        <select
                                            value={signupForm.department}
                                            onChange={(e) => setSignupForm({ ...signupForm, department: e.target.value })}
                                            className="input-dark appearance-none pr-10 cursor-pointer"
                                            style={{ background: 'var(--bg-elevated)' }}
                                        >
                                            <option value="" disabled>Choose your department</option>
                                            <option value={ADMIN_OPTION.value}>{ADMIN_OPTION.label}</option>
                                            <option disabled>──────────────────</option>
                                            {DEPARTMENTS.map((d) => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <span className="material-symbols-outlined text-xl">expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Government Email *</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. johndoe@karnataka.gov.in"
                                        value={signupForm.email}
                                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                                        className="input-dark"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Username *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. johndoe"
                                        value={signupForm.username}
                                        onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                                        className="input-dark"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Password *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Minimum 8 characters"
                                            value={signupForm.password}
                                            onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                            className="input-dark pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-xl">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-accent w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Creating Account…
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">person_add</span>
                                            Create Account
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* Warning Banner */}
                        <div className="border-t border-white/[0.06] px-6 py-4" style={{ background: 'var(--bg-elevated)' }}>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-yellow-500 shrink-0 text-base mt-0.5">warning</span>
                                <p className="text-[10px] leading-relaxed text-slate-500 uppercase tracking-wider font-semibold">
                                    Warning: Unauthorized access is prohibited. All activity is monitored and recorded by the Department of e-Governance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
