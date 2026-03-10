import { create } from "zustand";
import api from "../utils/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface WeightEntry {
  _id: string;
  user: string;
  weight: number;   // kg
  date: string;     // "YYYY-MM-DD"
  month: string;    // "YYYY-MM"
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientWeightData {
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    currentWeight: number;
  };
  entries: WeightEntry[];
}

/* Derived helpers exposed by the store for convenience */
export interface WeightStats {
  current: number | null;       // most recent logged weight
  starting: number | null;      // earliest logged weight
  lowest: number | null;
  highest: number | null;
  totalChange: number | null;   // current - starting  (negative = lost)
  totalEntries: number;
}

interface WeightState {
  /* Client's own data */
  entries: WeightEntry[];
  stats: WeightStats;
  loading: boolean;
  error: string | null;

  /* Coach view — one client at a time */
  coachClientData: ClientWeightData | null;
  coachLoading: boolean;

  /* Actions */
  logWeight: (weight: number, note?: string, date?: string) => Promise<WeightEntry | void>;
  fetchMyHistory: () => Promise<void>;
  triggerSnapshot: () => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;

  /* Coach action */
  fetchClientHistory: (clientId: string) => Promise<void>;
  clearClientData: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

function computeStats(entries: WeightEntry[]): WeightStats {
  if (!entries.length) {
    return {
      current: null, starting: null,
      lowest: null, highest: null,
      totalChange: null, totalEntries: 0,
    };
  }

  /* entries are newest-first from the API */
  const weights = entries.map(e => e.weight);
  const current  = weights[0];
  const starting = weights[weights.length - 1];

  return {
    current,
    starting,
    lowest:      Math.min(...weights),
    highest:     Math.max(...weights),
    totalChange: parseFloat((current - starting).toFixed(1)),
    totalEntries: entries.length,
  };
}

/* ═══════════════════════════════════════════════════════════════
   STORE
═══════════════════════════════════════════════════════════════ */

export const useWeightStore = create<WeightState>((set, get) => ({
  entries:         [],
  stats:           { current: null, starting: null, lowest: null, highest: null, totalChange: null, totalEntries: 0 },
  loading:         false,
  error:           null,
  coachClientData: null,
  coachLoading:    false,

  /* ── CLIENT: log weight ─────────────────────────────────── */
  logWeight: async (weight, note, date) => {
    try {
      set({ loading: true, error: null });

      const res = await api.post("/weight/log", {
        weight,
        note: note || "",
        ...(date && { date }),
      });

      const newEntry: WeightEntry = res.data;

      /* Merge into local entries: replace same-month entry or prepend */
      set((state) => {
        const withoutSameMonth = state.entries.filter(
          e => e.month !== newEntry.month
        );
        const updated = [newEntry, ...withoutSameMonth].sort(
          (a, b) => b.date.localeCompare(a.date)  // newest first
        );
        return {
          entries: updated,
          stats:   computeStats(updated),
          loading: false,
        };
      });

      return newEntry;
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to log weight",
      });
      throw err;
    }
  },

  /* ── CLIENT: fetch full history (also auto-snapshots server-side) ── */
  fetchMyHistory: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/weight/me");
      const entries: WeightEntry[] = Array.isArray(res.data) ? res.data : [];
      set({ entries, stats: computeStats(entries), loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to fetch weight history",
      });
    }
  },

  /* ── CLIENT: manual trigger for monthly snapshot ────────── */
  triggerSnapshot: async () => {
    try {
      await api.get("/weight/snapshot");
      /* Re-fetch so the new snapshot appears in the list */
      await get().fetchMyHistory();
    } catch (err: any) {
      console.warn("triggerSnapshot error:", err?.response?.data || err.message);
    }
  },

  /* ── CLIENT: delete a single entry ─────────────────────── */
  deleteEntry: async (entryId) => {
    try {
      set({ loading: true, error: null });
      await api.delete(`/weight/${entryId}`);
      set((state) => {
        const updated = state.entries.filter(e => e._id !== entryId);
        return { entries: updated, stats: computeStats(updated), loading: false };
      });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to delete entry",
      });
      throw err;
    }
  },

  /* ── COACH: view a client's history ─────────────────────── */
  fetchClientHistory: async (clientId) => {
    try {
      set({ coachLoading: true });
      const res = await api.get(`/weight/client/${clientId}`);
      set({ coachClientData: res.data, coachLoading: false });
    } catch (err: any) {
      console.error("fetchClientHistory error:", err?.response?.data || err.message);
      set({ coachLoading: false });
    }
  },

  /* ── COACH: clear client data when switching clients ─────── */
  clearClientData: () => {
    set({ coachClientData: null });
  },
}));