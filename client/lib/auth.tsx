/* ──────────────────────────────────────────────────────────────
   CivicFlow — Auth context & session helpers  (localStorage)
   ────────────────────────────────────────────────────────────── */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { UserSession } from "./types";

const STORAGE_KEY = "civicflow_session";

interface AuthContextType {
  session: UserSession | null;
  login: (s: UserSession) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  login: () => { },
  logout: () => { },
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEY);
      const userRaw = localStorage.getItem(`${STORAGE_KEY}_user`);
      if (token && userRaw) {
        setSession(JSON.parse(userRaw));
      }
    } catch { /* ignore corrupt data */ }
    setLoading(false);
  }, []);

  const login = useCallback((s: UserSession & { token?: string, id?: string }) => {
    if (s.token) {
      localStorage.setItem(STORAGE_KEY, s.token);
      const userBase = { id: s.id || "temp-id", name: s.name, role: s.role, department: s.department };
      localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(userBase));
      setSession(userBase);
    } else {
      // Mock fallback / signup
      localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(s));
      setSession(s);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_user`);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
