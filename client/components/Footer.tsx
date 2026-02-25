import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-white py-12">
            <div className="mx-auto max-w-7xl px-6 lg:px-10">
                <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#1a2a47] text-white">
                            <span className="material-symbols-outlined text-sm">account_balance</span>
                        </div>
                        <h2 className="text-lg font-bold tracking-tight text-[#1a2a47]">CivicFlow</h2>
                    </div>

                    <p className="text-sm text-slate-500">
                        © 2025 Government of Bengaluru. Built for transparency and efficiency.
                    </p>

                    <div className="flex gap-6">
                        <Link href="#" className="text-sm text-slate-500 hover:text-[#1a2a47] transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="#" className="text-sm text-slate-500 hover:text-[#1a2a47] transition-colors">
                            Security Protocol
                        </Link>
                        <Link href="#" className="text-sm text-slate-500 hover:text-[#1a2a47] transition-colors">
                            Accessibility
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
