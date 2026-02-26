import { create } from "zustand";
import api from "../utils/api";

interface SocialLinks {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

interface CoachProfile {
  _id: string;
  name: string;
  bio: string;
  avatar: string;
  socialLinks: SocialLinks;
  stripeOnboarded: boolean;
  createdAt: string;
}

interface CoachProfileState {
  coach: CoachProfile | null;
  loading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: FormData) => Promise<void>;
  deleteProfile: () => Promise<void>;
}

export const useCoachProfileStore = create<CoachProfileState>((set) => ({
  coach: null,
  loading: false,
  error: null,

  /* FETCH */
  fetchProfile: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/coach/me");
      set({ coach: res.data, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Failed to load profile",
        loading: false,
      });
    }
  },

  /* UPDATE (FormData) */
  updateProfile: async (data) => {
    try {
      set({ loading: true, error: null });
      
      const res = await api.put("/coach/me", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      set({ coach: res.data.coach, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Profile update failed",
        loading: false,
      });
    }
  },

  /* DELETE */
  deleteProfile: async () => {
    try {
      set({ loading: true, error: null });
      await api.delete("/coach/me");
      set({ coach: null, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Profile deletion failed",
        loading: false,
      });
    }
  },
}));
