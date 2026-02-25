/* ──────────────────────────────────────────────
   CivicFlow — KPI Card (Stitch Match)
   ────────────────────────────────────────────── */

interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
  trend?: { value: string; positive: boolean };
  color?: "blue" | "yellow" | "green" | "purple" | "primary" | "slate" | "red";
}

export default function KPICard({ label, value, icon, sub, trend, color = "primary" }: KPICardProps) {
  // Map color names to Tailwind utility class strings based on the Stitch mockup
  const colorMap: Record<string, { bg: string, text: string, trendText: string }> = {
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600", trendText: "text-accent-success" },
    yellow: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-600", trendText: "text-accent-warning" },
    green: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600", trendText: "text-accent-danger" }, // Using danger for "-8.1%" in mockup
    purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600", trendText: "text-accent-success" },
    primary: { bg: "bg-primary/10", text: "text-primary dark:text-white", trendText: "text-accent-success" },
    slate: { bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-600", trendText: "text-slate-500" },
    red: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600", trendText: "text-accent-danger" }
  };

  const selectedColor = colorMap[color] || colorMap.primary;

  // Render trend class (override if trend explicitly provides sign)
  let trendClass = selectedColor.trendText;
  if (trend) {
    trendClass = trend.positive ? "text-accent-success" : "text-accent-warning";
    if (!trend.positive && color === "green") trendClass = "text-accent-danger"; // To match mockup "Resolved Today -8.1% red"
    if (!trend.positive && color === "purple") trendClass = "text-accent-danger";
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${selectedColor.bg} ${selectedColor.text}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {trend && (
          <span className={`${trendClass} text-sm font-bold flex items-center`}>
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
        {sub && <span className="text-xs text-red-500 font-medium">{sub}</span>}
      </div>
    </div>
  );
}
