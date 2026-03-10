import { create } from "zustand";
import api from "../utils/api";

export interface Task {
  _id: string;
  coach: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
  };
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  completedAt?: string;
  completionNote?: string;
}

interface TaskState {
  coachTasks: Task[];
  clientTasks: Record<string, Task[]>;
  loading: boolean;
  error: string | null;

  createTask: (clientId: string, title: string, description: string, date: string) => Promise<void>;
  fetchCoachTasks: () => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  fetchClientTasks: () => Promise<void>;
  completeTask: (id: string, note?: string) => Promise<void>;
  editClientTask: (id: string, data: Partial<Task>) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  coachTasks: [],
  clientTasks: {},
  loading: false,
  error: null,

  createTask: async (clientId, title, description, date) => {
    try {
      await api.post("/tasks", { client: clientId, title, description, date });
      await get().fetchCoachTasks();
    } catch (err: any) {
      console.error("createTask:", err?.response?.data || err.message);
      throw err;
    }
  },

  fetchCoachTasks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get("/tasks/coach");
      set({ coachTasks: res.data, error: null });
    } catch (err: any) {
      console.error("fetchCoachTasks:", err?.response?.data || err.message);
      set({ error: "Failed to load tasks. Check your connection." });
    } finally {
      set({ loading: false }); // THE FIX — always runs
    }
  },

  updateTask: async (id, data) => {
    try {
      await api.put(`/tasks/${id}`, data);
      await get().fetchCoachTasks();
    } catch (err: any) {
      console.error("updateTask:", err?.response?.data || err.message);
      throw err;
    }
  },

  deleteTask: async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      await get().fetchCoachTasks();
    } catch (err: any) {
      console.error("deleteTask:", err?.response?.data || err.message);
      throw err;
    }
  },

  fetchClientTasks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get("/tasks");
      set({ clientTasks: res.data, error: null });
    } catch (err: any) {
      console.error("fetchClientTasks:", err?.response?.data || err.message);
      set({ error: "Failed to load tasks. Check your connection." });
    } finally {
      set({ loading: false }); // THE FIX — was missing, caused infinite spinner
    }
  },

  completeTask: async (id, note) => {
    try {
      await api.patch(`/tasks/${id}/complete`, { completionNote: note });
      await get().fetchClientTasks();
    } catch (err: any) {
      console.error("completeTask:", err?.response?.data || err.message);
      throw err;
    }
  },

  editClientTask: async (id, data) => {
    try {
      await api.put(`/tasks/client/${id}`, data);
      await get().fetchClientTasks();
    } catch (err: any) {
      console.error("editClientTask:", err?.response?.data || err.message);
      throw err;
    }
  },
}));