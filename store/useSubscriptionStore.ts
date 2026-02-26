import { create } from "zustand";
import api from "../utils/api";

export type PlanType = "3_MONTHS" | "6_MONTHS" | "12_MONTHS";

interface Subscription {
  planType: PlanType;
  status: "active" | "inactive" | "canceled" | "past_due";
  currentPeriodEnd: string;
}

interface SubscriptionStore {
  subscription: Subscription | null;
  loading: boolean;

  fetchMySubscription: () => Promise<void>;
  extendSubscription: (planType: PlanType) => Promise<void>;
}

const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  subscription: null,
  loading: false,

  fetchMySubscription: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/subscription/me");
      set({ subscription: res.data });
    } catch (err) {
      console.log("Fetch subscription error", err);
      set({ subscription: null });
    } finally {
      set({ loading: false });
    }
  },

  extendSubscription: async (planType: PlanType) => {
    try {
      set({ loading: true });
      const res = await api.post("/subscription/extend", { planType });
      set({ subscription: res.data });
    } catch (err) {
      console.log("Extend subscription error", err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));

export default useSubscriptionStore;
