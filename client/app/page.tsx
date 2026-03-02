import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const AUTHORITIES = [
  { icon: 'corporate_fare', short: 'BBMP', full: 'Mahanagara Palike', logo: '/logos/BBMP.jpg', href: 'https://bbmp.gov.in/home' },
  { icon: 'water_drop', short: 'BWSSB', full: 'Water & Sewerage', logo: '/logos/BWSSB.webp', href: 'https://bwssb.karnataka.gov.in/en' },
  { icon: 'bolt', short: 'BESCOM', full: 'Electricity Supply', logo: '/logos/BESCOM.png', href: 'https://www.bescom.co.in/bescom/main/home' },
  { icon: 'directions_bus', short: 'BMTC', full: 'Metropolitan Transport', logo: '/logos/BMTC.jpg', href: 'https://mybmtc.karnataka.gov.in' },
  { icon: 'architecture', short: 'BDA', full: 'Development Authority', logo: '/logos/BDA.png', href: 'https://bdakarnataka.in' },
  { icon: 'local_police', short: 'BCP', full: 'City Police', logo: '/logos/BCP.jpg', href: 'https://bcp.karnataka.gov.in/' },
];

const FEATURES = [
  {
    icon: 'analytics',
    title: 'Data-Driven Decisions',
    desc: 'Leverage advanced analytics to prioritize city-wide infrastructure projects based on real-time urgency and impact.',
  },
  {
    icon: 'dynamic_feed',
    title: 'Operational Efficiency',
    desc: 'Streamline service ticket lifecycles across multiple government bodies with automated routing and status tracking.',
  },
  {
    icon: 'verified_user',
    title: 'Public Trust',
    desc: 'Transparent governance through secure, verifiable operational tracking that ensures accountability at every level.',
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#f6f7f8]">
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero Section ── */}
        <section className="relative flex min-h-[85vh] items-center justify-center px-6 py-20">
          {/* Background image with overlay */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAU0Pw7909_Ah9eop4cagfHQQ5Wxmvf_dZzjKaXietNqcbIv2xp3zs5RX875D2fN8ND59kWntjGsANPzm7qLQfYlUecyzC5VXxUxjCJxEjOWEtI5NqdSueob-Ju4NYUnKolfz2ZpOXHh04j5iaB5K-OQzYMpkrZTaB5PqoKhq3wAZ4AFTOzows6JJWEy-6ylbhXGH-qYH83qnW-EMC-3pnTkfdnjOQHLLrBkj4TwPkquHo7Jc3FDV9OMPC44YGPOkhdrZlTOKC6724"
              alt="Bengaluru Vidhana Soudha"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Hero content */}
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div
              className="mb-6 inline-flex items-center rounded-full bg-[#1a2a47]/10 px-4 py-1.5 text-sm font-semibold text-[#1a2a47]"
              style={{ animation: 'fadeInUp 0.5s ease-out forwards' }}
            >
              <span className="mr-2 flex h-2 w-2 rounded-full bg-[#1a2a47]" />
              Official Government Portal
            </div>

            <h1
              className="mb-6 text-5xl font-black leading-tight tracking-tight text-slate-900 md:text-7xl"
              style={{ animation: 'fadeInUp 0.5s 0.1s ease-out both' }}
            >
              CivicFlow — Powering{' '}
              <span className="text-[#1a2a47]">Bengaluru&apos;s</span> Governance
            </h1>

            <p
              className="mx-auto mb-10 max-w-2xl text-lg font-medium leading-relaxed text-slate-700 md:text-xl"
              style={{ animation: 'fadeInUp 0.5s 0.2s ease-out both' }}
            >
              A secure, unified platform for civic authorities to manage service tickets, monitor
              infrastructure, and streamline city operations in real-time.
            </p>

            <div
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
              style={{ animation: 'fadeInUp 0.5s 0.3s ease-out both' }}
            >
              <Link
                href="/login"
                className="flex h-14 min-w-[200px] items-center justify-center rounded-xl bg-[#1a2a47] px-8 text-lg font-bold text-white shadow-lg shadow-[#1a2a47]/20 transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-[#243761]"
              >
                Access Dashboard
              </Link>
              <a
                href="#about"
                className="flex h-14 min-w-[200px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-8 text-lg font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <div className="bg-[#1a2a47] py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { value: '5+', label: 'Departments Connected' },
                { value: '10K+', label: 'Tickets Resolved' },
                { value: '98%', label: 'Uptime SLA' },
                { value: '< 2hr', label: 'Avg Response Time' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-black text-white">{stat.value}</div>
                  <div className="mt-1 text-sm font-medium text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── About Section ── */}
        <section className="bg-white py-24" id="about">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mb-16 max-w-3xl">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#1a2a47]">
                About CivicFlow
              </h2>
              <h3 className="text-4xl font-extrabold text-slate-900">
                Built for Trust and Efficiency
              </h3>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                CivicFlow is the central nervous system of Bengaluru&apos;s municipal administration.
                We provide a robust digital infrastructure that connects various departments, enabling
                data-driven decision making and faster resolution of civic issues.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-slate-100 bg-slate-50 p-8 transition-all hover:border-[#1a2a47]/20 hover:bg-white hover:shadow-xl"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1a2a47] text-white">
                    <span className="material-symbols-outlined">{f.icon}</span>
                  </div>
                  <h4 className="mb-3 text-xl font-bold text-slate-900">{f.title}</h4>
                  <p className="text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Authorities Section ── */}
        <section className="py-24" id="authorities">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mb-16 text-center">
              <h3 className="text-3xl font-extrabold text-slate-900">Authorities Served</h3>
              <p className="mt-4 text-slate-600">
                Unified collaboration between Bengaluru&apos;s key governing bodies.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              {AUTHORITIES.map((a) => (
                <a
                  key={a.short}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f6f7f8] overflow-hidden">
                    {a.logo ? (
                      <img
                        src={a.logo}
                        alt={`${a.short} logo`}
                        className="h-16 w-16 rounded-full object-cover scale-110"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-[#1a2a47]">
                        {a.icon}
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-slate-900 group-hover:text-[#1a2a47] transition-colors">{a.short}</p>
                  <p className="text-xs text-slate-500">{a.full}</p>
                  <span className="material-symbols-outlined text-xs text-slate-300 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security CTA ── */}
        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10" id="security">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1a2a47] px-8 py-20 text-center text-white lg:px-16">
            {/* Decorative blobs */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5" />

            <div className="relative z-10 mx-auto max-w-2xl">
              <span className="material-symbols-outlined mb-6 text-6xl opacity-80">encrypted</span>
              <h2 className="mb-6 text-4xl font-extrabold tracking-tight md:text-5xl">
                Secure Access for Officials
              </h2>
              <p className="mb-10 text-lg opacity-90">
                Authorized personnel only. Access requires valid government credentials. All sessions
                are monitored and logged by the Department of e-Governance.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-xl font-bold text-[#1a2a47] transition-all hover:scale-105 active:scale-95"
              >
                Login to Dashboard
                <span className="material-symbols-outlined">login</span>
              </Link>
              <p className="mt-6 text-sm opacity-60">
                Having trouble logging in?{' '}
                <a href="#" className="underline">
                  Contact IT Support
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
