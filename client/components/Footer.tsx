import Link from 'next/link';

const DEPARTMENTS = [
    { label: 'BBMP', full: 'Bruhat Bengaluru Mahanagara Palike', href: 'https://bbmp.gov.in/home' },
    { label: 'BWSSB', full: 'Water Supply & Sewerage Board', href: 'https://bwssb.karnataka.gov.in/en' },
    { label: 'BESCOM', full: 'Electricity Supply Company', href: 'https://www.bescom.co.in/bescom/main/home' },
    { label: 'BMTC', full: 'Metropolitan Transport Corp', href: 'https://mybmtc.karnataka.gov.in' },
    { label: 'BDA', full: 'Development Authority', href: 'https://bdakarnataka.in' },
    { label: 'BCP', full: 'Bengaluru City Police', href: 'https://bcp.karnataka.gov.in/' },
    { label: 'GBA', full: 'Governing Body Authority', href: 'https://bbmp.gov.in/KnowYourNewCorporation/index.html' },
];

const QUICK_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Login', href: '/login' },
    { label: 'Admin Dashboard', href: '/admin' },
];

const LEGAL_LINKS = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Accessibility Statement', href: '#' },
    { label: 'Security Protocol', href: '#' },
];

export default function Footer() {
    return (
        <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            {/* Main Footer */}
            <div className="mx-auto max-w-7xl px-6 lg:px-10 py-14">
                <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] text-[#020617] shadow-[0_0_16px_rgba(56,189,248,0.25)]">
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                            </div>
                            <span className="font-display text-xl font-700" style={{ color: 'var(--text-primary)' }}>
                                Civic<span className="text-[#38BDF8]">Flow</span>
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            A secure, unified platform for Bengaluru&apos;s civic authorities to manage service tickets and streamline city operations.
                        </p>
                    </div>

                    {/* Departments */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>Departments</h3>
                        <ul className="space-y-2.5">
                            {DEPARTMENTS.map(dept => (
                                <li key={dept.label}>
                                    <a
                                        href={dept.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-2 text-sm transition-colors hover:text-white"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <span className="font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}>{dept.label}</span>
                                        <span className="hidden sm:inline text-slate-600">—</span>
                                        <span className="hidden sm:inline truncate text-slate-500">{dept.full}</span>
                                        <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-60 transition-opacity">open_in_new</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>Quick Links</h3>
                        <ul className="space-y-2.5">
                            {QUICK_LINKS.map(link => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm transition-colors hover:text-white"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>Legal</h3>
                        <ul className="space-y-2.5">
                            {LEGAL_LINKS.map(link => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm transition-colors hover:text-white"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{ borderTop: '1px solid var(--border)' }}>
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        © 2026 Government of Bengaluru. Official Government Information System.
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Built for transparency and efficiency.
                    </p>
                </div>
            </div>
        </footer>
    );
}
