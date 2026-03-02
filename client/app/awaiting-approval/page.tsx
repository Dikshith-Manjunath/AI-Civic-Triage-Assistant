import Link from 'next/link';
import Footer from '@/components/Footer';

export default function AwaitingApprovalPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#f6f7f8]">
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
            </div>

            {/* Main content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-lg text-center">
                    {/* Icon */}
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-200">
                        <span className="material-symbols-outlined text-5xl text-amber-500">hourglass_top</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl font-bold text-slate-900 mb-3">Awaiting Approval</h1>
                    <p className="text-slate-600 text-lg leading-relaxed mb-2">
                        Your registration has been submitted successfully.
                    </p>
                    <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
                        A system administrator needs to verify and approve your account before you can access the platform. You will be able to log in once your account is approved.
                    </p>

                    {/* Status card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
                        <div className="flex items-center gap-4 justify-center">
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                                    <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                                </div>
                                <span className="text-xs font-semibold text-slate-700">Registered</span>
                            </div>
                            <div className="h-px w-12 bg-slate-200" />
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 animate-pulse">
                                    <span className="material-symbols-outlined text-amber-600 text-lg">pending</span>
                                </div>
                                <span className="text-xs font-semibold text-amber-600">Pending Review</span>
                            </div>
                            <div className="h-px w-12 bg-slate-200" />
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                    <span className="material-symbols-outlined text-slate-400 text-lg">lock_open</span>
                                </div>
                                <span className="text-xs font-semibold text-slate-400">Access Granted</span>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1a2a47] hover:bg-[#243761] text-white font-semibold rounded-lg transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Back to Login
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">home</span>
                            Go to Home
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
