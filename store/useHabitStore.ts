import { create } from "zustand";
import api from "../utils/api";

export interface Habit {
  _id: string;
  title: string;
  type: "boolean" | "number";
  target?: number;
}

interface HabitState {
  habits: Habit[];
  logs: Record<string, any>;
  steps: number;

  fetchToday: () => Promise<void>;
  updateHabit: (habitId: string, value: any) => Promise<void>;
  updateSteps: (steps: number) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  logs: {},
  steps: 0,

  fetchToday: async () => {
    const res = await api.get("/habits/today");

    const logMap: Record<string, any> = {};
    res.data.logs.forEach((log: any) => {
      logMap[log.habit] = log.value;
    });

    set({
      habits: res.data.habits,
      logs: logMap,
      steps: res.data.steps,
    });
  },

  updateHabit: async (habitId, value) => {
    const date = new Date().toISOString().split("T")[0];

    await api.post("/habits/log", { habitId, value, date });

    set((state) => ({
      logs: { ...state.logs, [habitId]: value },
    }));
  },

  updateSteps: async (steps) => {
    const date = new Date().toISOString().split("T")[0];

    await api.post("/habits/steps", { steps, date });

    set({ steps });
  },
}));