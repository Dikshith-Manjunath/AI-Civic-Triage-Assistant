'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const { theme, toggle } = useTheme();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const isDark = theme === 'dark';

    return (
        <header
            className={`sticky top-0 z-50 w-full transition-all duration-500 ${
                scrolled
                    ? 'shadow-[0_4px_32px_var(--shadow-color)] border-b'
                    : 'border-b border-transparent'
            }`}
            style={{
                background: scrolled ? 'var(--nav-bg)' : 'transparent',
                backdropFilter: scrolled ? 'blur(20px)' : 'none',
                borderColor: scrolled ? 'var(--border)' : 'transparent',
            }}
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] text-white shadow-lg shadow-[rgba(56,189,248,0.25)] transition-all group-hover:shadow-[rgba(56,189,248,0.4)] group-hover:scale-105">
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                    </div>
                    <span className="font-display text-xl font-700 tracking-tight" style={{ color: 'var(--nav-logo-text)' }}>
                        Civic<span style={{ color: 'var(--accent)' }}>Flow</span>
                    </span>
                </Link>

                {/* Nav Links — desktop */}
                <nav className="hidden items-center gap-10 md:flex">
                    {[
                        { label: 'About', href: '#about' },
                        { label: 'Authorities', href: '#authorities' },
                        { label: 'Security', href: '#security' },
                    ].map(link => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="group relative text-sm font-semibold transition-colors duration-200"
                            style={{ color: 'var(--nav-link)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--nav-link-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--nav-link)')}
                        >
                            {link.label}
                            <span className="absolute -bottom-0.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: 'var(--accent)' }} />
                        </a>
                    ))}
                </nav>

                {/* CTA + Theme Toggle */}
                <div className="flex items-center gap-3">
                    {/* ── Theme Toggle ── */}
                    <button
                        onClick={toggle}
                        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                        className="relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 cursor-pointer"
                        style={{
                            background: isDark ? 'rgba(56,189,248,0.12)' : 'rgba(2,132,199,0.08)',
                            border: `1px solid ${isDark ? 'rgba(56,189,248,0.2)' : 'rgba(2,132,199,0.15)'}`,
                        }}
                    >
                        {/* Sun icon */}
                        <span
                            className="material-symbols-outlined absolute text-lg transition-all duration-300"
                            style={{
                                fontVariationSettings: "'FILL' 1",
                                color: isDark ? 'var(--text-muted)' : '#D97706',
                                opacity: isDark ? 0 : 1,
                                transform: isDark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
                            }}
                        >
                            light_mode
                        </span>
                        {/* Moon icon */}
                        <span
                            className="material-symbols-outlined absolute text-lg transition-all duration-300"
                            style={{
                                fontVariationSettings: "'FILL' 1",
                                color: isDark ? '#38BDF8' : 'var(--text-muted)',
                                opacity: isDark ? 1 : 0,
                                transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
                            }}
                        >
                            dark_mode
                        </span>
                    </button>

                    <Link
                        href="/login"
                        className="hidden md:flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                        style={{
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: isDark ? 'rgba(56,189,248,0.3)' : 'rgba(2,132,199,0.25)',
                            background: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(2,132,199,0.06)',
                            color: 'var(--accent)',
                        }}
                    >
                        <span className="material-symbols-outlined text-base">login</span>
                        Login
                    </Link>

                    {/* Mobile menu toggle */}
                    <button
                        className="flex md:hidden items-center justify-center p-2 transition-colors cursor-pointer"
                        style={{ color: 'var(--nav-link)' }}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div
                    className="md:hidden border-t px-6 pb-6 pt-4 space-y-4 animate-fade-in"
                    style={{
                        background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(20px)',
                        borderColor: 'var(--border)',
                    }}
                >
                    {['About', 'Authorities', 'Security'].map(label => (
                        <a
                            key={label}
                            href={`#${label.toLowerCase()}`}
                            onClick={() => setMenuOpen(false)}
                            className="block text-sm font-semibold transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {label}
                        </a>
                    ))}

                    {/* Mobile theme toggle */}
                    <button
                        onClick={() => { toggle(); setMenuOpen(false); }}
                        className="flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {isDark ? 'light_mode' : 'dark_mode'}
                        </span>
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    <Link
                        href="/login"
                        className="mt-2 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold w-full justify-center"
                        style={{ background: 'var(--accent)', color: isDark ? '#020617' : '#FFFFFF' }}
                    >
                        <span className="material-symbols-outlined text-base">login</span>
                        Login to Dashboard
                    </Link>
                </div>
            )}
        </header>
    );
}
