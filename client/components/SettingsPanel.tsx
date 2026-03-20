'use client';

import { useState } from 'react';

type Props = {
    username: string;
    email: string;
    role: string;
    department: string;
    deptLabel: string;
};

export default function SettingsPanel({ username, email, role, department, deptLabel }: Props) {
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'preferences'>('profile');
    const [saved, setSaved] = useState(false);

    /* Profile state */
    const [displayName, setDisplayName] = useState(username);
    const [phone, setPhone] = useState('');

    /* Notification state */
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(true);
    const [ticketUpdates, setTicketUpdates] = useState(true);
    const [dailyDigest, setDailyDigest] = useState(false);
    const [criticalAlerts, setCriticalAlerts] = useState(true);

    /* Preferences state */
    const [timezone] = useState('Asia/Kolkata');
    const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
    const [rowsPerPage, setRowsPerPage] = useState('25');
    const [autoRefresh, setAutoRefresh] = useState(true);

    function handleSave() {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    }

    const tabs = [
        { key: 'profile' as const, label: 'Profile', icon: 'person' },
        { key: 'notifications' as const, label: 'Notifications', icon: 'notifications' },
        { key: 'preferences' as const, label: 'Preferences', icon: 'tune' },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Tabs */}
            <div className="rounded-2xl border border-white/[0.07] p-4 space-y-1 h-fit" style={{ background: 'var(--bg-surface)' }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                            activeTab === t.key
                                ? 'text-white'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                        }`}
                        style={activeTab === t.key ? { background: 'rgba(56,189,248,0.1)', borderLeft: '2px solid #38BDF8' } : {}}
                    >
                        <span
                            className={`material-symbols-outlined text-lg ${activeTab === t.key ? 'text-[#38BDF8]' : ''}`}
                            style={activeTab === t.key ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                            {t.icon}
                        </span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="lg:col-span-3 space-y-6">
                {/* ────── Profile ────── */}
                {activeTab === 'profile' && (
                    <>
                        <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                            <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#38BDF8] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                                Account Information
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">Your CivicFlow identity and department assignment</p>

                            <div className="flex items-center gap-5 mb-8">
                                <div className="size-16 rounded-2xl bg-gradient-to-br from-[#38BDF8] to-[#818CF8] flex items-center justify-center text-2xl font-display font-800 text-[#020617]">
                                    {username.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white">{username}</p>
                                    <p className="text-sm text-slate-400">{email}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20">
                                            {role}
                                        </span>
                                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#818CF8]/15 text-[#818CF8] border border-[#818CF8]/20">
                                            {deptLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Display Name</label>
                                    <input className="input-dark w-full" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Email Address</label>
                                    <input className="input-dark w-full opacity-60 cursor-not-allowed" value={email} readOnly />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Phone Number</label>
                                    <input className="input-dark w-full" placeholder="+91 XXXXX XXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Department</label>
                                    <input className="input-dark w-full opacity-60 cursor-not-allowed" value={`${deptLabel} (${department.toUpperCase()})`} readOnly />
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                            <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#F97316] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                                Security
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">Password and session management</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Current Password</label>
                                    <input className="input-dark w-full" type="password" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">New Password</label>
                                    <input className="input-dark w-full" type="password" placeholder="••••••••" />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ────── Notifications ────── */}
                {activeTab === 'notifications' && (
                    <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                        <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#38BDF8] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                            Notification Preferences
                        </h3>
                        <p className="text-xs text-slate-500 mb-6">Control how you receive alerts and updates</p>

                        <div className="space-y-4">
                            <Toggle label="Email Notifications" desc="Receive ticket updates via email" checked={emailNotifs} onChange={setEmailNotifs} />
                            <Toggle label="Push Notifications" desc="Browser push for real-time alerts" checked={pushNotifs} onChange={setPushNotifs} />
                            <Toggle label="Ticket Status Updates" desc="Get notified when tickets change status" checked={ticketUpdates} onChange={setTicketUpdates} />
                            <Toggle label="Daily Digest" desc="Daily summary of department activity" checked={dailyDigest} onChange={setDailyDigest} />
                            <Toggle label="Critical Alerts" desc="Immediate notification for high-urgency tickets" checked={criticalAlerts} onChange={setCriticalAlerts} />
                        </div>
                    </div>
                )}

                {/* ────── Preferences ────── */}
                {activeTab === 'preferences' && (
                    <div className="rounded-2xl border border-white/[0.07] p-6" style={{ background: 'var(--bg-surface)' }}>
                        <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#818CF8] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>tune</span>
                            Display & Data Preferences
                        </h3>
                        <p className="text-xs text-slate-500 mb-6">Customize your dashboard experience</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Timezone</label>
                                <input className="input-dark w-full opacity-60 cursor-not-allowed" value={timezone} readOnly />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Date Format</label>
                                <select
                                    className="input-dark w-full cursor-pointer"
                                    value={dateFormat}
                                    onChange={e => setDateFormat(e.target.value)}
                                >
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Rows per Page</label>
                                <select
                                    className="input-dark w-full cursor-pointer"
                                    value={rowsPerPage}
                                    onChange={e => setRowsPerPage(e.target.value)}
                                >
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] p-4" style={{ background: 'var(--bg-elevated)' }}>
                                <div>
                                    <p className="text-sm font-semibold text-white">Auto-refresh Dashboard</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Refresh data every 30 seconds</p>
                                </div>
                                <ToggleSwitch checked={autoRefresh} onChange={setAutoRefresh} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="flex items-center gap-4">
                    <button onClick={handleSave} className="btn-accent flex items-center gap-2 py-3 px-8 rounded-xl">
                        <span className="material-symbols-outlined text-sm">save</span>
                        Save Changes
                    </button>
                    {saved && (
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#22C55E] animate-fade-in-up">
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Settings saved successfully
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Toggle Row ── */
function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
            <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
            </div>
            <ToggleSwitch checked={checked} onChange={onChange} />
        </div>
    );
}

/* ── Toggle Switch ── */
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${
                checked ? 'bg-[#38BDF8]' : 'bg-slate-700'
            }`}
        >
            <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform shadow-md ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}
