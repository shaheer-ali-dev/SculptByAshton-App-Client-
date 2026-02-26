import { create } from "zustand";
import api from "../utils/api";

type PlanStats = {
  monthly: number;
  yearly: number;
};

type PeriodStats = {
  totalClientsAdded: number;
  paidClients: number;
  plans: PlanStats;
};

interface AnalyticsState {
  loading: boolean;
  error: string | null;

  week: PeriodStats | null;
  month: PeriodStats | null;
  year: PeriodStats | null;

  fetchCoachAnalytics: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  loading: false,
  error: null,

  week: null,
  month: null,
  year: null,

  fetchCoachAnalytics: async () => {
    try {
      set({ loading: true, error: null });

      const res = await api.get("/analytics/coach");

      set({
        week: res.data.week,
        month: res.data.month,
        year: res.data.year,
        loading: false,
      });
    } catch (err: any) {
      set({
        error:
          err?.response?.data?.msg ||
          "Failed to load analytics",
        loading: false,
      });
    }
  },
}));
