import { create } from "zustand";
import api from "../utils/api";

interface AuthState {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (form: FormData) => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  login: async (email, password) => {
    set({ loading: true });
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    set({ user: res.data.user, loading: false });
  },
  register: async (formData) => {
    set({ loading: true });
    const res = await api.post("/auth/register", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    localStorage.setItem("token", res.data.token);
    set({ user: res.data.user, loading: false });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ user: null });
  },

  loadUser: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data });
    } catch {
      set({ user: null });
    }
  },
}));
