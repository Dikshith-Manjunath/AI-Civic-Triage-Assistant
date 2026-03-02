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
        <footer className="bg-[#1a2a47] text-white">
            {/* Main Footer */}
            <div className="mx-auto max-w-7xl px-6 lg:px-10 py-14">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                                <span className="material-symbols-outlined text-lg">account_balance</span>
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">CivicFlow</h2>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                            A secure, unified platform for Bengaluru&apos;s civic authorities to manage service tickets, monitor infrastructure, and streamline city operations.
                        </p>
                    </div>

                    {/* Departments */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-4">Departments</h3>
                        <ul className="space-y-2.5">
                            {DEPARTMENTS.map(dept => (
                                <li key={dept.label}>
                                    <a
                                        href={dept.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                                    >
                                        <span className="font-semibold text-white/90 group-hover:text-white">{dept.label}</span>
                                        <span className="hidden sm:inline text-white/40">—</span>
                                        <span className="hidden sm:inline truncate">{dept.full}</span>
                                        <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-60 transition-opacity">open_in_new</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-4">Quick Links</h3>
                        <ul className="space-y-2.5">
                            {QUICK_LINKS.map(link => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-white/70 hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-4">Legal</h3>
                        <ul className="space-y-2.5">
                            {LEGAL_LINKS.map(link => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-white/70 hover:text-white transition-colors"
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
            <div className="border-t border-white/10">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-white/40">
                        © 2026 Government of Bengaluru. Official Government Information System.
                    </p>
                    <p className="text-xs text-white/40">
                        Built for transparency and efficiency.
                    </p>
                </div>
            </div>
        </footer>
    );
}
