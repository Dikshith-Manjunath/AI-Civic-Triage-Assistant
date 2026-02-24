/* Redirect root → login */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RootPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [session, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
    </div>
  );
}
