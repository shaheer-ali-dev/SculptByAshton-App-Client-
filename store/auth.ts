import { create } from "zustand";
import api from "../utils/api";
import { Storage } from "../utils/storage"; // ✅ cross-platform

export interface ClientUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: any | null;
  loading: boolean;
  coachClients: ClientUser[];
  clientsLoading: boolean;
  clientsError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (form: FormData) => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
  fetchCoachClients: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  coachClients: [],
  clientsLoading: false,
  clientsError: null,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post("/auth/login", { email, password });
      await Storage.set("token", res.data.token); // ✅
      set({ user: res.data.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (formData) => {
    set({ loading: true });
    try {
      const res = await api.post("/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await Storage.set("token", res.data.token); // ✅
      set({ user: res.data.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await Storage.remove("token"); // ✅
    set({ user: null, coachClients: [] });
  },

  loadUser: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data });
    } catch {
      set({ user: null });
    }
  },

  fetchCoachClients: async () => {
    set({ clientsLoading: true, clientsError: null });
    try {
      const res = await api.get("/auth/clients");
      set({ coachClients: res.data });
    } catch (err: any) {
      console.error("fetchCoachClients:", err?.response?.data || err.message);
      set({ clientsError: "Failed to load clients." });
    } finally {
      set({ clientsLoading: false });
    }
  },
}));