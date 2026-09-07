"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api } from "@/lib/client";

export type User = { id: number; nome: string; email: string; telefone?: string | null; foto?: string | null };
export type Meliponario = {
  id: number;
  nome: string;
  descricao?: string | null;
  cidade?: string | null;
  estado?: string | null;
  localizacao?: string | null;
  codigoConvite?: string | null;
  logo?: string | null;
  funcao?: string;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  melisLoaded: boolean;
  melis: Meliponario[];
  current: Meliponario | null;
  setCurrent: (m: Meliponario | null) => void;
  refreshUser: () => Promise<void>;
  refreshMelis: () => Promise<Meliponario[]>;
  logout: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

// localStorage can throw (SecurityError) inside sandboxed iframes or when the
// browser blocks storage. Every access must be guarded or the app goes blank.
const storage = {
  get(key: string): string | null {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable - ignore */
    }
  },
  remove(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable - ignore */
    }
  },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [melis, setMelis] = useState<Meliponario[]>([]);
  const [melisLoaded, setMelisLoaded] = useState(false);
  const [current, setCurrentState] = useState<Meliponario | null>(null);

  const setCurrent = useCallback((m: Meliponario | null) => {
    setCurrentState(m);
    if (m) storage.set("meli_current", String(m.id));
    else storage.remove("meli_current");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const r = await api<{ user: User | null }>("/api/auth/me");
      setUser(r.user);
    } catch {
      setUser(null);
    }
  }, []);

  const refreshMelis = useCallback(async () => {
    try {
      const r = await api<{ meliponarios: Meliponario[] }>("/api/meliponarios");
      setMelis(r.meliponarios);
      const savedId = Number(storage.get("meli_current"));
      setCurrentState((prev) => {
        if (prev) {
          const found = r.meliponarios.find((m) => m.id === prev.id);
          if (found) return found;
        }
        if (savedId) {
          const found = r.meliponarios.find((m) => m.id === savedId);
          if (found) return found;
        }
        return r.meliponarios[0] || null;
      });
      return r.meliponarios;
    } catch {
      return [];
    } finally {
      setMelisLoaded(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  useEffect(() => {
    if (user) refreshMelis();
  }, [user, refreshMelis]);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMelis([]);
    setMelisLoaded(false);
    setCurrentState(null);
    storage.remove("meli_current");
  }, []);

  return (
    <AppCtx.Provider value={{ user, loading, melisLoaded, melis, current, setCurrent, refreshUser, refreshMelis, logout }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
