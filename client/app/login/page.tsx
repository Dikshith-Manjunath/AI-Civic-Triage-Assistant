"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DEPT_LIST, DEPARTMENTS, type Department, type UserRole } from "@/lib/types";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState<Department>("roads");
  const [role, setRole] = useState<UserRole>("officer");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        login({
          token: data.token,
          name: data.user.name,
          department: data.user.department,
          role: data.user.role
        } as any);
        router.push("/dashboard");

      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role, department })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');

        // Auto-login after successful signup
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error || 'Auto-login failed after signup');

        login({
          token: loginData.token,
          name: loginData.user.name,
          department: loginData.user.department,
          role: loginData.user.role
        } as any);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col">
      {/* Background Decoration */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"></div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Card Header */}
          <div className="pt-8 pb-6 px-8 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 flex items-center justify-center bg-primary rounded-lg text-white">
                <svg className="size-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">CivicFlow</h1>
            </div>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-semibold">Official Portal {isLogin ? 'Login' : 'Signup'}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {isLogin ? 'Enter your credentials to access the dashboard' : 'Create a new official account for the dashboard'}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-10">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Authority</label>
                    <div className="relative">
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value as Department)}
                        className="appearance-none w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      >
                        {DEPT_LIST.map((d) => (
                          <option key={d} value={d}>{DEPARTMENTS[d]}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                    <div className="relative grid grid-cols-2 gap-3">
                      {(["officer", "admin"] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${role === r
                            ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20 dark:text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                        >
                          {r === "officer" ? "Officer" : "Administrator"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Email/Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="e.g. johndoe@karnataka.gov.in"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {isLogin && (
                <div className="flex items-center justify-end">
                  <button className="text-sm font-medium text-primary hover:underline" type="button">Forgot Password?</button>
                </div>
              )}

              {/* Submit Button */}
              <button disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-lg shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50" type="submit">
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">{isLogin ? 'lock' : 'person_add'}</span>
                    {isLogin ? 'Secure Login' : 'Create Account'}
                  </>
                )}
              </button>

              <div className="text-center mt-4">
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors">
                  {isLogin ? "Need access? Request an account" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </div>

          {/* Warning Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 shrink-0">warning</span>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Warning: Unauthorized access is prohibited. All activity is monitored and recorded by the Department of e-Governance.
              </p>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <footer className="mt-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 opacity-70 grayscale hover:grayscale-0 transition-all">
            <img alt="Government of Karnataka Seal" className="h-14 w-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTnKg_NZP0B9MhibZaxUaIOYq36Df0mW2_fQr4J9GOQwzeeZFBFdg4oI1loU_4GebhCKe_uNnDp7bMmdoXKFVKqUfs1dFYFOCj7LWsd3gUisxScPQnCO7yYZux9PYbW6MVi9DlDiI4fnQ1lfURbXiTHA-l2koaG0krpKJw5OA2mJjWsne2IHEUYGzDKPWn8ngF5NJCUo0B7fIddaVufsyZ8j14olQ75bDBNLEreHeg4DUKwItYuPECLD1HRkqmlt9Z7i0G6FJt2os" />
            <div className="h-10 w-px bg-slate-300 dark:bg-slate-700"></div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-slate-900 dark:text-slate-100 font-bold text-xl tracking-tight">Bengaluru</span>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mt-1">Smart City Initiative</span>
            </div>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            © 2024 CivicFlow | Government of Karnataka
          </p>
        </footer>
      </main>
    </div>
  );
}
