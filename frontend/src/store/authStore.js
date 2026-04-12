import { create } from "zustand";

import { api, getToken, setToken } from "../lib/api.js";

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: false,
  error: null,

  /** Load profile when a token exists (e.g. after refresh). */
  bootstrap: async () => {
    if (!getToken()) {
      set({ user: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const { user } = await api.me();
      set({ user, loading: false });
    } catch {
      setToken(null);
      set({ user: null, loading: false, error: null });
    }
  },

  setSessionToken: (token) => {
    setToken(token);
    return get().bootstrap();
  },

  logout: () => {
    setToken(null);
    set({ user: null, error: null });
  },
}));
