import Link from 'next/link';
import Footer from '@/components/Footer';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col bg-[#f6f7f8]">
            {/* ── Top Navigation Bar ── */}
            <header className="w-full border-b border-slate-200 bg-white px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="text-[#1a2a47]">
                            <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#1a2a47]">CivicFlow</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                        <div className="size-9 rounded-full bg-[#1a2a47]/10 border border-[#1a2a47]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#1a2a47] text-lg">person</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main className="flex-grow flex items-center justify-center px-6">
                <div className="max-w-2xl w-full text-center py-16">
                    {/* Large 404 Watermark */}
                    <div className="mb-4">
                        <span className="text-[#1a2a47]/10 text-[120px] md:text-[180px] font-extrabold leading-none select-none">
                            404
                        </span>
                    </div>

                    {/* Error Message */}
                    <div className="relative -mt-16 md:-mt-24">
                        <h1 className="text-3xl md:text-4xl font-bold text-[#1a2a47] mb-4">
                            Page Not Found
                        </h1>
                        <p className="text-slate-600 text-lg max-w-md mx-auto mb-10 leading-relaxed">
                            The requested URL was not found on this server. This may be due to a
                            mistyped address or a page that has been moved or archived.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/"
                                className="inline-flex items-center justify-center px-8 py-3 bg-[#1a2a47] hover:bg-[#243761] text-white font-semibold rounded-lg transition-colors shadow-sm min-w-[200px]"
                            >
                                Return to Dashboard
                            </Link>
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center px-8 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors shadow-sm min-w-[200px]"
                            >
                                Contact Support
                            </Link>
                        </div>
                    </div>

                    {/* Informational Help Cards */}
                    <div className="mt-20 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        <div>
                            <h3 className="font-semibold text-[#1a2a47] mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">search</span>
                                Verify URL
                            </h3>
                            <p className="text-sm text-slate-500 leading-normal">
                                Please check the address for any spelling errors or extra characters.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#1a2a47] mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">history</span>
                                Check History
                            </h3>
                            <p className="text-sm text-slate-500 leading-normal">
                                Use your browser&apos;s back button or check your recent activity logs.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#1a2a47] mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">info</span>
                                System Status
                            </h3>
                            <p className="text-sm text-slate-500 leading-normal">
                                The requested resource might be temporarily unavailable during updates.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Footer ── */}
            <Footer />
        </div>
    );
}
