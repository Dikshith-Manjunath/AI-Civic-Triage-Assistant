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
  login: () => {},
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch { /* ignore corrupt data */ }
    setLoading(false);
  }, []);

  const login = useCallback((s: UserSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
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
