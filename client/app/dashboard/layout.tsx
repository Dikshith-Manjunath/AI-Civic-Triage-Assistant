/* ──────────────────────────────────────────────
   CivicFlow — Dashboard layout  (sidebar + auth guard)
   ────────────────────────────────────────────── */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <Sidebar />
      <main className="ml-56 flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
