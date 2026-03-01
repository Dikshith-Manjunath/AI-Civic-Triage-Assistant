'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';

const DEPARTMENTS = [
    { value: 'bbmp', label: 'BBMP (Bruhat Bengaluru Mahanagara Palike)' },
    { value: 'bwssb', label: 'BWSSB (Bangalore Water Supply & Sewerage Board)' },
    { value: 'bescom', label: 'BESCOM (Bangalore Electricity Supply Company)' },
    { value: 'bmtc', label: 'BMTC (Bangalore Metropolitan Transport Corp)' },
    { value: 'bda', label: 'BDA (Bangalore Development Authority)' },
    { value: 'gba', label: 'GBA (Governing Body Authority)' },
];

// Admin is kept separate — shown at top with a visual divider
const ADMIN_OPTION = { value: 'admin', label: '⚙ System Administrator' };

export default function LoginPage() {
    const router = useRouter();
    const [tab, setTab] = useState<'login' | 'signup'>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    /* ── Login state ── */
    const [loginForm, setLoginForm] = useState({
        email: '',
        password: '',
        department: '',
    });

    /* ── Signup state ── */
    const [signupForm, setSignupForm] = useState({
        fullName: '',
        email: '',
        username: '',
        password: '',
        department: '',
    });

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

    const inputClass =
        'w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1a2a47] focus:border-transparent outline-none transition-all text-sm placeholder:text-slate-400';

    const selectClass =
        'appearance-none w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1a2a47] focus:border-transparent outline-none transition-all text-sm';

    return (
        <div className="relative min-h-screen flex flex-col bg-[#f6f7f8]">
            {/* Background decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#1a2a47] rounded-full blur-3xl opacity-10" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#1a2a47]/20 rounded-full blur-[120px] opacity-10" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-10">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a2a47] text-white transition-transform group-hover:scale-105">
                        <span className="material-symbols-outlined text-lg">account_balance</span>
                    </div>
                    <span className="text-lg font-extrabold tracking-tight text-[#1a2a47]">CivicFlow</span>
                </Link>
                <Link href="/" className="text-sm font-medium text-slate-500 hover:text-[#1a2a47] transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back to Home
                </Link>
            </div>

            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 py-8">
                <div className="w-full max-w-[460px]">
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        {/* Card Header */}
                        <div className="pt-8 pb-4 px-8 flex flex-col items-center">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 flex items-center justify-center bg-[#1a2a47] rounded-xl text-white">
                                    <span className="material-symbols-outlined">account_balance</span>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CivicFlow</h1>
                            </div>
                            <h2 className="text-slate-900 text-lg font-semibold">
                                {tab === 'login' ? 'Official Portal Login' : 'Create Official Account'}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1 text-center">
                                {tab === 'login'
                                    ? 'Enter your credentials to access the dashboard'
                                    : 'Register with your government credentials'}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex mx-8 mb-2 rounded-xl bg-slate-100 p-1">
                            <button
                                onClick={() => { setTab('login'); setError(''); }}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'login'
                                    ? 'bg-white text-[#1a2a47] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => { setTab('signup'); setError(''); }}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'signup'
                                    ? 'bg-white text-[#1a2a47] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Register
                            </button>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="mx-8 mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500 text-base">error</span>
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        {/* ── LOGIN FORM ── */}
                        {tab === 'login' && (
                            <form onSubmit={handleLogin} className="px-8 pb-8 pt-4 space-y-4">
                                {/* Department */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Select Authority</label>
                                    <div className="relative">
                                        <select
                                            value={loginForm.department}
                                            onChange={(e) => setLoginForm({ ...loginForm, department: e.target.value })}
                                            className={selectClass}
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

                                {/* Email / Username */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Username / Email</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. johndoe@karnataka.gov.in"
                                        value={loginForm.email}
                                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>

                                {/* Password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={loginForm.password}
                                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                            className={inputClass}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#1a2a47] transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end">
                                    <button type="button" className="text-sm font-medium text-[#1a2a47] hover:underline">
                                        Forgot Password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#1a2a47] hover:bg-[#243761] disabled:opacity-60 text-white font-semibold py-3.5 rounded-lg shadow-md shadow-[#1a2a47]/20 transition-all flex items-center justify-center gap-2"
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
                                {/* Full Name */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        Full Name <span className="text-slate-400 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Rajesh Kumar"
                                        value={signupForm.fullName}
                                        onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>

                                {/* Department */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Select Authority *</label>
                                    <div className="relative">
                                        <select
                                            value={signupForm.department}
                                            onChange={(e) => setSignupForm({ ...signupForm, department: e.target.value })}
                                            className={selectClass}
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

                                {/* Email */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Government Email *</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. johndoe@karnataka.gov.in"
                                        value={signupForm.email}
                                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>

                                {/* Username */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Username *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. johndoe"
                                        value={signupForm.username}
                                        onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>

                                {/* Password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Password *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Minimum 8 characters"
                                            value={signupForm.password}
                                            onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                            className={inputClass}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#1a2a47] transition-colors"
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
                                    className="w-full bg-[#1a2a47] hover:bg-[#243761] disabled:opacity-60 text-white font-semibold py-3.5 rounded-lg shadow-md shadow-[#1a2a47]/20 transition-all flex items-center justify-center gap-2"
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
                        <div className="bg-slate-50 border-t border-slate-200 p-4">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-amber-600 shrink-0 text-xl">warning</span>
                                <p className="text-[11px] leading-relaxed text-slate-600 uppercase tracking-wider font-semibold">
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
