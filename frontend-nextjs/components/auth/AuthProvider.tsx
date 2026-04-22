"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchMe, logout as apiLogout } from "@/lib/auth";
import type { User } from "@/types/user";

export type AuthStatus = "loading" | "authed" | "anon";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshKey((k) => k + 1);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me) {
          setUser(me);
          setStatus("authed");
        } else {
          setUser(null);
          setStatus("anon");
        }
      } catch {
        if (cancelled) return;
        setUser(null);
        setStatus("anon");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <AuthContext.Provider value={{ status, user, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
