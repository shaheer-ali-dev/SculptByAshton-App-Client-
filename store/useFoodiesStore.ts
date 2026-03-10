import { create } from "zustand";
import api from "../utils/api";

/* ======================================================
   TYPES
====================================================== */

export interface ShoppingItem {
  _id: string;
  item: string;
  quantity?: string;
  price?: number;
  date: string;
}

interface FoodiesState {
  // Favorite Meals
  favoriteMeals: string[];
  loadingFavorites: boolean;

  fetchFavorites: (clientId?: string) => Promise<void>;
  updateFavorites: (meals: string[], clientId?: string) => Promise<void>;
  deleteFavoriteMeal: (meal: string, clientId?: string) => Promise<void>;

  // Shopping
  shopping: ShoppingItem[];
  loadingShopping: boolean;

  addShopping: (
    data: {
      item: string;
      quantity?: string;
      price?: number;
      date: string;
      clientId?: string;
    }
  ) => Promise<void>;

  fetchShopping: (clientId?: string) => Promise<void>;
  updateShopping: (
    id: string,
    data: Partial<ShoppingItem>
  ) => Promise<void>;
  deleteShopping: (id: string) => Promise<void>;
}

/* ======================================================
   STORE
====================================================== */

export const useFoodiesStore = create<FoodiesState>((set, get) => ({
  /* ================= FAVORITES ================= */

  favoriteMeals: [],
  loadingFavorites: false,

  fetchFavorites: async (clientId) => {
    try {
      set({ loadingFavorites: true });

      const res = await api.get("/foodies/favorites", {
        params: clientId ? { clientId } : {},
      });

      set({
        favoriteMeals: res.data,
        loadingFavorites: false,
      });
    } catch (err) {
      set({ loadingFavorites: false });
      console.error("Fetch favorites error:", err);
    }
  },

  updateFavorites: async (meals, clientId) => {
    try {
      await api.put("/foodies/favorites", {
        meals,
        clientId,
      });

      set({ favoriteMeals: meals });
    } catch (err) {
      console.error("Update favorites error:", err);
    }
  },

  deleteFavoriteMeal: async (meal, clientId) => {
    try {
      await api.delete("/foodies/favorites", {
        data: { meal, clientId },
      });

      const updated = get().favoriteMeals.filter(
        (m) => m.toLowerCase() !== meal.toLowerCase()
      );

      set({ favoriteMeals: updated });
    } catch (err) {
      console.error("Delete favorite error:", err);
    }
  },

  /* ================= SHOPPING ================= */

  shopping: [],
  loadingShopping: false,

  addShopping: async (data) => {
    try {
      await api.post("/foodies/", data);
      await get().fetchShopping(data.clientId);
    } catch (err) {
      console.error("Add shopping error:", err);
    }
  },

  fetchShopping: async (clientId) => {
    try {
      set({ loadingShopping: true });

      const res = await api.get("/foodies/", {
        params: clientId ? { clientId } : {},
      });

      set({
        shopping: res.data,
        loadingShopping: false,
      });
    } catch (err) {
      set({ loadingShopping: false });
      console.error("Fetch shopping error:", err);
    }
  },

  updateShopping: async (id, data) => {
    try {
      await api.put(`/foodies/${id}`, data);
      await get().fetchShopping();
    } catch (err) {
      console.error("Update shopping error:", err);
    }
  },

  deleteShopping: async (id) => {
    try {
      await api.delete(`/foodies/${id}`);
      set({
        shopping: get().shopping.filter((item) => item._id !== id),
      });
    } catch (err) {
      console.error("Delete shopping error:", err);
    }
  },
}));