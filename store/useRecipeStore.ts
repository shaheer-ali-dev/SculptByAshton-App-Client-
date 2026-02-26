import { create } from "zustand";
import api from "../utils/api";

/* ===============================
   TYPES
================================ */

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  _id: string;
  dishName: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snacks"; // added
  ingredients: Ingredient[];
  description?: string;
  steps?: string[];                                       // added
  coach?: { name: string };
  createdAt?: string;
}

interface RecipeState {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;

  /* Coach actions */
  createRecipe: (
    dishName: string,
    mealType: "breakfast" | "lunch" | "dinner" | "snacks",
    ingredients: Ingredient[],
    description?: string,
    steps?: string[]
  ) => Promise<Recipe | void>;

  updateRecipe: (
    id: string,
    dishName: string,
    mealType: "breakfast" | "lunch" | "dinner" | "snacks",
    ingredients: Ingredient[],
    description?: string,
    steps?: string[]
  ) => Promise<Recipe | void>;

  deleteRecipe: (id: string) => Promise<void>;

  /* Fetch actions */
  fetchCoachRecipes: () => Promise<void>;
  fetchAllRecipes: () => Promise<void>;
}

/* ===============================
   STORE
================================ */

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  loading: false,
  error: null,

  /* ─── COACH CREATE ──────────────────────────────────────── */
  createRecipe: async (dishName, mealType, ingredients, description, steps) => {
    try {
      set({ loading: true, error: null });

      const res = await api.post("/recipes", {
        dishName,
        mealType,
        ingredients,
        description: description || "",
        steps: steps || [],
      });

      set((state) => ({
        recipes: [res.data, ...state.recipes],
        loading: false,
      }));

      return res.data;
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to create recipe",
      });
      throw err;
    }
  },

  /* ─── COACH UPDATE ──────────────────────────────────────── */
  updateRecipe: async (id, dishName, mealType, ingredients, description, steps) => {
    try {
      set({ loading: true, error: null });

      const res = await api.put(`/recipes/${id}`, {
        dishName,
        mealType,
        ingredients,
        description: description || "",
        steps: steps || [],
      });

      set((state) => ({
        recipes: state.recipes.map((r) => (r._id === id ? res.data : r)),
        loading: false,
      }));

      return res.data;
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to update recipe",
      });
      throw err;
    }
  },

  /* ─── COACH DELETE ──────────────────────────────────────── */
  deleteRecipe: async (id) => {
    try {
      set({ loading: true, error: null });

      await api.delete(`/recipes/${id}`);

      set((state) => ({
        recipes: state.recipes.filter((r) => r._id !== id),
        loading: false,
      }));
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to delete recipe",
      });
      throw err;
    }
  },

  /* ─── COACH FETCH (flat array) ──────────────────────────── */
  fetchCoachRecipes: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/recipes/coach");
      set({ recipes: Array.isArray(res.data) ? res.data : [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  /* ─── CLIENT FETCH (grouped object) ────────────────────── */
  /* NOTE: Returns { breakfast: [], lunch: [], dinner: [], snacks: [] }
     The client recipes page reads this as-is via:
       const grouped = rawRecipes as unknown as Record<MealType, Recipe[]>
     Do NOT change the shape of the response here — it will break the client page. */
  fetchAllRecipes: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/recipes");
      set({ recipes: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
