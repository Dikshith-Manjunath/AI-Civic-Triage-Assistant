'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${scrolled
                    ? 'border-slate-200 bg-white/80 backdrop-blur-md shadow-sm'
                    : 'border-transparent bg-white/60 backdrop-blur-sm'
                }`}
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a2a47] text-white transition-transform group-hover:scale-105">
                        <span className="material-symbols-outlined text-xl">account_balance</span>
                    </div>
                    <h2 className="text-xl font-extrabold tracking-tight text-[#1a2a47]">CivicFlow</h2>
                </Link>

                {/* Nav Links */}
                <nav className="hidden items-center gap-10 md:flex">
                    <a
                        href="#about"
                        className="text-sm font-semibold text-slate-600 hover:text-[#1a2a47] transition-colors"
                    >
                        About
                    </a>
                    <a
                        href="#authorities"
                        className="text-sm font-semibold text-slate-600 hover:text-[#1a2a47] transition-colors"
                    >
                        Authorities
                    </a>
                    <a
                        href="#security"
                        className="text-sm font-semibold text-slate-600 hover:text-[#1a2a47] transition-colors"
                    >
                        Security
                    </a>
                </nav>

                {/* CTA */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="rounded-lg bg-[#1a2a47] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#243761] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1a2a47]/20"
                    >
                        Login to Dashboard
                    </Link>
                </div>
            </div>
        </header>
    );
}
