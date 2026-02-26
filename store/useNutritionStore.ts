import { create } from "zustand";
import api from "../utils/api";

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface NutritionRecipe {
  _id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snacks";
  dishName: string;
  description?: string;
  ingredients: Ingredient[];
  coach?: { name: string };
}

interface NutritionState {
  grouped: {
    breakfast: NutritionRecipe[];
    lunch: NutritionRecipe[];
    dinner: NutritionRecipe[];
    snacks: NutritionRecipe[];
  };
  loading: boolean;

  createRecipe: (
    mealType: string,
    dishName: string,
    description: string,
    ingredients: Ingredient[]
  ) => Promise<void>;

  fetchCoachRecipes: () => Promise<void>;
  fetchAllRecipes: () => Promise<void>;
}

export const useNutritionStore = create<NutritionState>((set) => ({
  grouped: {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  },
  loading: false,

  createRecipe: async (mealType, dishName, description, ingredients) => {
    await api.post("/nutrition", {
      mealType,
      dishName,
      description,
      ingredients,
    });
  },

  fetchCoachRecipes: async () => {
    set({ loading: true });
    const res = await api.get("/nutrition/coach");

    const grouped = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    };

    res.data.forEach((r: NutritionRecipe) => {
      grouped[r.mealType].push(r);
    });

    set({ grouped, loading: false });
  },

  fetchAllRecipes: async () => {
    set({ loading: true });
    const res = await api.get("/nutrition");
    set({ grouped: res.data, loading: false });
  },
}));