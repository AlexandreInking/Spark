import { create } from "zustand";
import { db } from "../lib/db";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (code: string, displayName?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, _get) => ({
  user: null,
  loading: true,
  init: async () => {
    try {
      const raw = localStorage.getItem("uc_session");
      if (raw) {
        const u: User = JSON.parse(raw);
        // verificar sigue existiendo en db
        const existing = await db.getUserByCode(u.studentCode);
        if (existing) set({ user: existing, loading: false });
        else set({ user: null, loading: false });
      } else set({ loading: false });
    } catch { set({ loading: false }); }
  },
  login: async (code, displayName) => {
    const clean = code.trim().toUpperCase();
    if (!clean || clean.length < 3) return { ok: false, error: "Código muy corto (mín 3)" };
    if (!/^[A-Z0-9\-]+$/.test(clean)) return { ok: false, error: "Solo letras, números y guión" };
    let user = await db.getUserByCode(clean);
    if (!user) {
      if (!displayName || !displayName.trim()) return { ok: false, error: "Para registro inicial ingresa tu nombre" };
      user = { id: crypto.randomUUID(), studentCode: clean, displayName: displayName.trim(), createdAt: new Date().toISOString() };
      await db.createUser(user);
    }
    localStorage.setItem("uc_session", JSON.stringify(user));
    set({ user });
    return { ok: true };
  },
  logout: () => {
    localStorage.removeItem("uc_session");
    set({ user: null });
  },
}));
