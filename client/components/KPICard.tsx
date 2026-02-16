interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "blue",
}: KPICardProps) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    red: "from-red-500 to-red-600",
    green: "from-green-500 to-green-600",
    yellow: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`mt-1 text-sm font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${
            colorMap[color] || colorMap.blue
          } text-xl text-white`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
