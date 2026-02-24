/* ──────────────────────────────────────────────
   CivicFlow — Login page
   ────────────────────────────────────────────── */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DEPT_LIST, DEPARTMENTS, type Department, type UserRole } from "@/lib/types";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState<Department>("roads");
  const [role, setRole] = useState<UserRole>("officer");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    login({ name: name.trim(), department, role });
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white text-lg font-bold">
            C
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">CivicFlow</h1>
          <p className="mt-1 text-sm text-neutral-500">Operations Dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-neutral-400 transition-colors focus:border-black focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Department */}
          <div>
            <label htmlFor="dept" className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
              Department
            </label>
            <select
              id="dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black transition-colors focus:border-black focus:ring-0 focus:outline-none appearance-none"
            >
              {DEPT_LIST.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENTS[d]}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
              Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["officer", "admin"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    role === r
                      ? "border-black bg-black text-white"
                      : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  {r === "officer" ? "Officer" : "Administrator"}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full rounded-lg bg-black py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Demo mode &mdash; no credentials required
        </p>
      </div>
    </div>
  );
}
