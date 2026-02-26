import { create } from "zustand";
import api from "../utils/api";

interface Nutrition {
  Calories: number;
  Protein: number;
  Carbs: number;
  Fat: number;
}

interface CalorieState {
  loading: boolean;
  error: string | null;
  nutrition: Nutrition | null;

  fetchCalories: (dish: string, servings?: number) => Promise<void>;
  clear: () => void;
}

export const useCalorieStore = create<CalorieState>((set) => ({
  loading: false,
  error: null,
  nutrition: null,

  fetchCalories: async (dish, servings) => {
    try {
      set({ loading: true, error: null });

      const res = await api.post("/calorie", { dish, servings });
      set({ nutrition: res.data.nutrition, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Failed to fetch nutrition",
        loading: false,
      });
    }
  },

  clear: () => set({ nutrition: null, error: null }),
}));
