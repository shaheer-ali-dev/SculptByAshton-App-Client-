import { create } from "zustand";
import api from "../utils/api";

type PlanType = "monthly" | "yearly";

interface StripeState {
  loading: boolean;
  error: string | null;

  // Coach actions
  connectStripe: () => Promise<void>;
  setPricing: (amount: number, planType: PlanType) => Promise<void>;

  // Client actions
  checkout: (coachId: string, planType: PlanType) => Promise<void>;
}

export const useStripeStore = create<StripeState>((set) => ({
  loading: false,
  error: null,

  connectStripe: async () => {
    try {
      set({ loading: true, error: null });

      const res = await api.post("/stripe/connect");

      // Stripe returns onboarding URL
      window.location.href = res.data.url;
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Stripe connect failed",
        loading: false,
      });
    }
  },


  setPricing: async (amount, planType) => {
    try {
      set({ loading: true, error: null });

      await api.post("/stripe/pricing", {
        amount,
        planType,
      });

      set({ loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Pricing update failed",
        loading: false,
      });
    }
  },

  checkout: async (coachId, planType) => {
    try {
      set({ loading: true, error: null });

      const res = await api.post("/stripe/checkout", {
        coachId,
        planType,
      });

      // Redirect user to Stripe Checkout
      window.location.href = res.data.url;
    } catch (err: any) {
      set({
        error: err?.response?.data?.msg || "Checkout failed",
        loading: false,
      });
    }
  },
}));
