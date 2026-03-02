// BCP Reports Page based on Stitch UI

export default function BCPReports() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Analytics & Reports</h2>
                    <p className="text-slate-500 text-sm mt-1">Incident statistics and performance metrics.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line Chart Placeholder */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-slate-900">Incident Trends</h4>
                        <select className="text-xs bg-slate-50 border-slate-200 rounded-lg py-1 px-2 border outline-none">
                            <option>Weekly</option>
                            <option>Monthly</option>
                        </select>
                    </div>
                    <div className="h-64 relative">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 240">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#1a2a47" stopOpacity="0.1"></stop>
                                    <stop offset="100%" stopColor="#1a2a47" stopOpacity="0"></stop>
                                </linearGradient>
                            </defs>
                            <path d="M0,180 Q100,160 200,190 T400,100 T600,140 T800,80 L800,240 L0,240 Z" fill="url(#chartGradient)"></path>
                            <path d="M0,180 Q100,160 200,190 T400,100 T600,140 T800,80" fill="none" stroke="#1a2a47" strokeLinecap="round" strokeWidth="3"></path>
                            <circle cx="400" cy="100" fill="#1a2a47" r="4"></circle>
                            <text fill="#1a2a47" fontSize="10" fontWeight="bold" x="390" y="85">Peak: 1240</text>
                        </svg>
                        <div className="flex justify-between mt-4 px-2">
                            <span className="text-[10px] text-slate-400 font-bold">MON</span>
                            <span className="text-[10px] text-slate-400 font-bold">TUE</span>
                            <span className="text-[10px] text-slate-400 font-bold">WED</span>
                            <span className="text-[10px] text-slate-400 font-bold">THU</span>
                            <span className="text-[10px] text-slate-400 font-bold">FRI</span>
                            <span className="text-[10px] text-slate-400 font-bold">SAT</span>
                            <span className="text-[10px] text-slate-400 font-bold">SUN</span>
                        </div>
                    </div>
                </div>

                {/* Donut Chart Placeholder */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-6">Category Breakdown</h4>
                    <div className="flex flex-col items-center justify-center">
                        <div className="relative w-48 h-48">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle className="stroke-slate-100" cx="18" cy="18" fill="none" r="16" strokeWidth="4"></circle>
                                <circle className="stroke-[#1a2a47]" cx="18" cy="18" fill="none" r="16" strokeDasharray="40 100" strokeLinecap="round" strokeWidth="4"></circle>
                                <circle className="stroke-blue-400" cx="18" cy="18" fill="none" r="16" strokeDasharray="25 100" strokeDashoffset="-40" strokeLinecap="round" strokeWidth="4"></circle>
                                <circle className="stroke-amber-400" cx="18" cy="18" fill="none" r="16" strokeDasharray="20 100" strokeDashoffset="-65" strokeLinecap="round" strokeWidth="4"></circle>
                                <circle className="stroke-emerald-400" cx="18" cy="18" fill="none" r="16" strokeDasharray="15 100" strokeDashoffset="-85" strokeLinecap="round" strokeWidth="4"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-bold text-slate-900">842</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total</span>
                            </div>
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#1a2a47]"></div>
                                <span className="text-xs text-slate-600">Traffic</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                                <span className="text-xs text-slate-600">Emergency</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                <span className="text-xs text-slate-600">Theft</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                <span className="text-xs text-slate-600">Public Nuis.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
