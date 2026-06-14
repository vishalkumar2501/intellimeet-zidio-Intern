import { create } from "zustand";
import type { AuthState } from "@/types/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getInitialAuth = () => {
  const token = localStorage.getItem("accessToken");
  const userStr = localStorage.getItem("user");
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return { user, accessToken: token, isAuthenticated: true };
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
  }
  return { user: null, accessToken: null, isAuthenticated: false };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...getInitialAuth(),

  setAuth: (user, token) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, accessToken: token, isAuthenticated: true });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    localStorage.setItem("user", JSON.stringify(updated));
    set({ user: updated });
  },

  refreshAccessToken: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        get().logout();
        return null;
      }
      const { accessToken } = await res.json();
      const user = get().user;
      if (user) {
        localStorage.setItem("accessToken", accessToken);
        set({ accessToken, isAuthenticated: true });
      }
      return accessToken as string;
    } catch {
      return null;
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors during logout
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  hydrateAuth: () => {
    const auth = getInitialAuth();
    set(auth);
  },
}));
