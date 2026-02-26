import { create } from "zustand";
import api from "../utils/api";

/* ======================================================
   🔹 TYPES
====================================================== */

export interface FavoriteFoodsByCategory {
  fruits?: string;
  vegetables?: string;
  grains?: string;
  dairy?: string;
  meat?: string;
}

export interface UserCRM {
  _id: string;

  firstName?: string;
  lastName?: string;
  email: string;
  role: "client" | "coach" | "admin" | "user";

  avatar?: string;
  bio?: string;
  note?: string;

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

  favoriteFoodsByCategory?: FavoriteFoodsByCategory;

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

  streak: number;
  xp: number;

  createdAt: string;
}

interface UserCRMState {
  users: UserCRM[];
  selectedUser: UserCRM | null;
  loading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  fetchUserById: (id: string) => Promise<void>;
  updateUser: (id: string, data: Partial<UserCRM>) => Promise<void>;
}

/* ======================================================
   🔹 STORE
====================================================== */

export const useUserCRMStore = create<UserCRMState>((set) => ({
  users: [],
  selectedUser: null,
  loading: false,
  error: null,

  fetchUsers: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/crm/users");
      set({ users: res.data, loading: false });
    } catch (err: any) {
      console.error("fetchUsers error:", err);
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to fetch users",
      });
    }
  },

  fetchUserById: async (id) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/crm/users/${id}`);
      set({ selectedUser: res.data, loading: false });
    } catch (err: any) {
      console.error("fetchUserById error:", err);
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to fetch user",
      });
    }
  },

  updateUser: async (id, data) => {
  try {
    set({ loading: true, error: null });
    console.log("store.updateUser: PUT crm/users/", id, "data=", data);
    const res = await api.put(`/crm/users/${id}`, data);

    console.log("updateUser response:", res.data);
    set((state) => ({
      users: state.users.map((u) => (u._id === id ? res.data : u)),
      selectedUser: res.data,
      loading: false,
    }));
  } catch (err: any) {
    console.error("updateUser error:", err?.response?.data || err);
    set({
      loading: false,
      error: err?.response?.data?.msg || "Failed to update user",
    });
    throw err;
  }
},
}));