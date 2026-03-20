import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const AUTHORITIES = [
  { icon: 'corporate_fare', short: 'BBMP', full: 'Mahanagara Palike', logo: '/logos/BBMP.jpg', href: 'https://bbmp.gov.in/home' },
  { icon: 'water_drop', short: 'BWSSB', full: 'Water & Sewerage', logo: '/logos/BWSSB.webp', href: 'https://bwssb.karnataka.gov.in/en' },
  { icon: 'bolt', short: 'BESCOM', full: 'Electricity Supply', logo: '/logos/BESCOM.png', href: 'https://www.bescom.co.in/bescom/main/home' },
  { icon: 'directions_bus', short: 'BMTC', full: 'Metro Transport', logo: '/logos/BMTC.jpg', href: 'https://mybmtc.karnataka.gov.in' },
  { icon: 'architecture', short: 'BDA', full: 'Development Authority', logo: '/logos/BDA.png', href: 'https://bdakarnataka.in' },
  { icon: 'local_police', short: 'BCP', full: 'City Police', logo: '/logos/BCP.jpg', href: 'https://bcp.karnataka.gov.in/' },
];

const FEATURES = [
  {
    icon: 'analytics',
    title: 'Data-Driven Decisions',
    desc: 'Leverage advanced analytics to prioritize city-wide infrastructure projects based on real-time urgency and impact.',
    color: '#38BDF8',
  },
  {
    icon: 'dynamic_feed',
    title: 'Operational Efficiency',
    desc: 'Streamline service ticket lifecycles across multiple government bodies with automated routing and status tracking.',
    color: '#818CF8',
  },
  {
    icon: 'verified_user',
    title: 'Public Trust',
    desc: 'Transparent governance through secure, verifiable operational tracking that ensures accountability at every level.',
    color: '#34D399',
  },
];

const STATS = [
  { value: '6+', label: 'Departments' },
  { value: '10K+', label: 'Tickets Resolved' },
  { value: '98%', label: 'Uptime SLA' },
  { value: '<2hr', label: 'Avg Response' },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative flex min-h-[90vh] items-center justify-center px-6 py-24 overflow-hidden grain-overlay">
          {/* Background image + dark overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAU0Pw7909_Ah9eop4cagfHQQ5Wxmvf_dZzjKaXietNqcbIv2xp3zs5RX875D2fN8ND59kWntjGsANPzm7qLQfYlUecyzC5VXxUxjCJxEjOWEtI5NqdSueob-Ju4NYUnKolfz2ZpOXHh04j5iaB5K-OQzYMpkrZTaB5PqoKhq3wAZ4AFTOzows6JJWEy-6ylbhXGH-qYH83qnW-EMC-3pnTkfdnjOQHLLrBkj4TwPkquHo7Jc3FDV9OMPC44YGPOkhdrZlTOKC6724"
              alt="Bengaluru Vidhana Soudha"
              className="h-full w-full object-cover"
            />
            {/* Multi-layer overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/85 via-[#020617]/75 to-[#020617]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/60 via-transparent to-[#020617]/60" />
          </div>

          {/* Radial glow centers */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#38BDF8]/5 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-[#818CF8]/8 blur-[90px]" />
          </div>

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#38BDF8]/20 bg-[#38BDF8]/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#38BDF8] animate-fade-in-up"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
              Official Government Portal — Karnataka
            </div>

            {/* Heading */}
            <h1
              className="font-display mb-6 text-5xl font-800 leading-[1.05] tracking-tight text-white md:text-7xl animate-fade-in-up animate-delay-100"
            >
              CivicFlow —{' '}
              <span className="gradient-text">Powering</span>
              <br />
              <span className="text-white">Bengaluru&apos;s</span>{' '}
              <span className="text-slate-400">Governance</span>
            </h1>

            {/* Sub */}
            <p
              className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-400 animate-fade-in-up animate-delay-200"
            >
              A secure, unified platform for civic authorities to manage service tickets,
              monitor critical infrastructure, and streamline city operations in real-time.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up animate-delay-300"
            >
              <Link
                href="/login"
                className="btn-accent flex h-14 min-w-[200px] items-center justify-center gap-2 rounded-xl px-8 text-base font-bold shadow-[0_8px_32px_rgba(56,189,248,0.25)]"
              >
                <span className="material-symbols-outlined text-xl">login</span>
                Access Dashboard
              </Link>
              <a
                href="#about"
                className="flex h-14 min-w-[200px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20"
              >
                <span className="material-symbols-outlined text-xl">info</span>
                Learn More
              </a>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020617] to-transparent" />
        </section>

        {/* ── Stats Bar ────────────────────────────────────── */}
        <div className="relative border-y py-10" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-display text-4xl font-800" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                  <div className="mt-1 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── About / Features ─────────────────────────────── */}
        <section className="py-28" id="about" style={{ background: 'var(--bg)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            {/* Section label */}
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px flex-1 max-w-[3rem] bg-[#38BDF8]/40" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#38BDF8]">About CivicFlow</span>
            </div>

            <div className="mb-16 max-w-3xl">
              <h2 className="font-display text-4xl font-800 leading-tight" style={{ color: 'var(--text-primary)' }}>
                Built for Trust<br />
                <span style={{ color: 'var(--text-muted)' }}>and Efficiency</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                CivicFlow is the central nervous system of Bengaluru&apos;s municipal administration.
                We provide a robust digital infrastructure that connects various departments, enabling
                data-driven decision making and faster resolution of civic issues.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="group relative rounded-2xl p-8 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s`, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  {/* Top accent line on hover */}
                  <div
                    className="absolute inset-x-0 top-0 h-px rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${f.color}, transparent)` }}
                  />

                  <div
                    className="mb-6 flex h-13 w-13 items-center justify-center rounded-xl"
                    style={{ background: `${f.color}1A` }}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ color: f.color, fontVariationSettings: "'FILL' 1" }}
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="mb-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Authorities ──────────────────────────────────── */}
        <section className="py-24 border-t border-white/[0.05]" id="authorities" style={{ background: 'var(--bg-surface)' }}>
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mb-14 text-center">
              <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
                <span className="h-px w-8 bg-[#38BDF8]/40" />
                Partner Bodies
                <span className="h-px w-8 bg-[#38BDF8]/40" />
              </div>
              <h2 className="font-display text-3xl font-800" style={{ color: 'var(--text-primary)' }}>Authorities Served</h2>
              <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
                Unified collaboration between Bengaluru&apos;s key governing bodies.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {AUTHORITIES.map((a) => (
                <a
                  key={a.short}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center justify-center rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                    {a.logo ? (
                      <img
                        src={a.logo}
                        alt={`${a.short} logo`}
                        className="h-16 w-16 rounded-full object-cover scale-110"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-[#38BDF8]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {a.icon}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold transition-colors" style={{ color: 'var(--text-primary)' }}>{a.short}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>{a.full}</p>
                  <span className="material-symbols-outlined mt-2 text-[11px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    open_in_new
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security CTA ─────────────────────────────────── */}
        <section className="py-24 px-6 lg:px-10" id="security" style={{ background: 'var(--bg)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-3xl px-8 py-20 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              {/* Background glow */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#38BDF8]/5 blur-[100px]" />
              </div>
              {/* Grid pattern */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              />

              <div className="relative z-10 mx-auto max-w-2xl">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#38BDF8]/20 bg-[#38BDF8]/10">
                    <span className="material-symbols-outlined text-3xl text-[#38BDF8]" style={{ fontVariationSettings: "'FILL' 1" }}>encrypted</span>
                  </div>
                </div>
                <h2 className="font-display mb-6 text-4xl font-800 tracking-tight md:text-5xl" style={{ color: 'var(--text-primary)' }}>
                  Secure Access
                  <br />
                  <span className="gradient-text">for Officials</span>
                </h2>
                <p className="mb-10 text-lg" style={{ color: 'var(--text-secondary)' }}>
                  Authorized personnel only. Access requires valid government credentials. All sessions
                  are monitored and logged by the Department of e-Governance.
                </p>
                <Link
                  href="/login"
                  className="btn-accent inline-flex items-center gap-2 rounded-xl px-10 py-4 text-lg font-bold shadow-[0_8px_32px_rgba(56,189,248,0.3)]"
                >
                  Login to Dashboard
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <p className="mt-6 text-sm text-slate-600">
                  Having trouble?{' '}
                  <a href="#" className="text-slate-400 hover:text-white transition-colors underline underline-offset-2">
                    Contact IT Support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
