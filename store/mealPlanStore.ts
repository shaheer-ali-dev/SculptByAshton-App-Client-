import { create } from "zustand";
import api from "../utils/api";

/* ======================================================
   🔹 SHARED TYPES
====================================================== */

export interface DayMeals {
  breakfast: string[];
  brunch: string[];
  lunch: string[];
  eveningSnack: string[];
  dinner: string[];
}

export interface WeekMeals {
  monday: DayMeals;
  tuesday: DayMeals;
  wednesday: DayMeals;
  thursday: DayMeals;
  friday: DayMeals;
  saturday: DayMeals;
  sunday: DayMeals;
}

export interface MealPlan {
  _id: string;
  title: string;
  description?: string;
  user: string;
  createdBy: string;
  days: WeekMeals;
  createdAt: string;
}

/* ======================================================
   🟢 COACH STORE
====================================================== */

interface CoachMealPlanState {
  clients: { _id: string; name: string }[];
  mealPlansByUser: Record<string, MealPlan[]>;
  loading: boolean;
  error: string | null;

  fetchClients: () => Promise<void>;
  fetchMealPlansByUser: (userId: string) => Promise<void>;
  createMealPlan: (data: any) => Promise<void>;
  updateMealPlan: (mealPlanId: string, data: any) => Promise<void>;
}

export const useCoachMealPlanStore = create<CoachMealPlanState>((set) => ({
  clients: [],
  mealPlansByUser: {},
  loading: false,
  error: null,

  fetchClients: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/mealplans/clients");
      set({ clients: res.data, loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to fetch clients",
      });
    }
  },

  fetchMealPlansByUser: async (userId) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/mealplans/coach/mealplans/${userId}`);
      set((state) => ({
        mealPlansByUser: {
          ...state.mealPlansByUser,
          [userId]: res.data,
        },
        loading: false,
      }));
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to fetch meal plans",
      });
    }
  },

  createMealPlan: async (data) => {
    try {
      set({ loading: true, error: null });
      await api.post("/mealplans/coach/mealplans/create", data);
      set({ loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to create meal plan",
      });
    }
  },

  updateMealPlan: async (mealPlanId, data) => {
    try {
      set({ loading: true, error: null });
      await api.put(`/mealplans/coach/mealplans/${mealPlanId}`, data);
      set({ loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to update meal plan",
      });
    }
  },
}));

/* ======================================================
   🔵 CLIENT STORE
====================================================== */

interface ClientMealPlanState {
  mealPlans: MealPlan[];
  loading: boolean;
  error: string | null;

  fetchMealPlans: () => Promise<void>;
  updateMealPlan: (mealPlanId: string, days: WeekMeals) => Promise<void>;
}

export const useClientMealPlanStore = create<ClientMealPlanState>((set) => ({
  mealPlans: [],
  loading: false,
  error: null,

  fetchMealPlans: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/mealplans/client/mealplans");
      set({ mealPlans: res.data, loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to fetch meal plans",
      });
    }
  },

  updateMealPlan: async (mealPlanId, days) => {
    try {
      set({ loading: true, error: null });
      const res = await api.put(`/mealplans/coach/mealplans/${mealPlanId}`, {
        days,
      });

      set((state) => ({
        mealPlans: state.mealPlans.map((mp) =>
          mp._id === mealPlanId ? res.data.mealPlan : mp
        ),
        loading: false,
      }));
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to update meal plan",
      });
    }
  },
}));
