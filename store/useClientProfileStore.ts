import { create } from "zustand";
import api from "../utils/api";

export interface UserProfile {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  note?: string; // added note
  phoneNumber?: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  monthlyFoodBudget?: string;
  mealPrep?: boolean;
  weightTrainingDaysPerWeek?: number;
  foodAllergens?: string;
  foodRestrictions?: string;
  favoriteWholeFoods?: string;
  favoriteMeals?: string;
  favoriteFoodsByCategory?: Record<string, string>;
  caffeine?: boolean;
  smoking?: boolean;
  alcohol?: boolean;
  injuriesOrSurgeries?: string;
  medicalConditions?: string;
  medications?: string;
  occupation?: string;
  stressLevel?: string;
  eatingHabitsRating?: string;
  fitnessLevel?: string;
  physicalActivity?: boolean;
  workedWithCoachBefore?: boolean;
  hasBodyWeightScale?: boolean;
  dailyRoutine?: string;
  weeklyWorkoutSplit?: string;
  motivation?: string;
  pastChallenges?: string;
  coachNotes?: string;
  streak?: number;
  xp?: number;
  createdAt?: string;
}

interface ClientProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: FormData | Partial<UserProfile>) => Promise<void>;
  deleteProfile: () => Promise<void>;
}

export const useClientProfileStore = create<ClientProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/client/me");
      // server returns full client object
      set({ profile: res.data, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Failed to fetch profile",
        loading: false,
      });
    }
  },

  updateProfile: async (data) => {
    try {
      set({ loading: true, error: null });

      // If sending FormData, axios will set the correct headers
      const res =
        data instanceof FormData ? await api.put("/client/me", data) : await api.put("/client/me", data);

      // server responds: { msg: "Profile updated", client }
      set({ profile: res.data.client, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Failed to update profile",
        loading: false,
      });
    }
  },

  deleteProfile: async () => {
    try {
      set({ loading: true, error: null });
      await api.delete("/client/me");
      set({ profile: null, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Failed to delete profile",
        loading: false,
      });
    }
  },
}));