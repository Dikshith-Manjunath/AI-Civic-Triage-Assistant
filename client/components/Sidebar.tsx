"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/tickets", label: "Tickets", icon: "🎫" },
  { href: "/map", label: "Map", icon: "🗺️" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/submit", label: "Submit", icon: "📝" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
          C
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
            CivicFlow
          </h1>
          <p className="text-xs text-zinc-500">AI Triage Assistant</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          System Online
        </div>
      </div>
    </aside>
  );
}
