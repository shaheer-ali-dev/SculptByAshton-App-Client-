import { create } from "zustand";
import api from "@/utils/api";

/* =======================
   TYPES
======================= */

export interface Program {
  _id: string;
  title: string;
  description?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationWeeks?: number;
  coverImage?: string;
  exercises: any[];
}

export interface DailyProgress {
  _id: string;
  user: string;
  program: string;
  date: string;
  exercises: any[];
}

/* =======================
   STORE STATE
======================= */

interface ProgramStore {
  loading: boolean;
  error: string | null;

  // shared
  programs: Program[];
  progress: DailyProgress[];

  // coach
  clients: any[];

  // actions
  getClients: () => Promise<void>;
  createProgram: (data: FormData) => Promise<void>;
  updateProgram: (programId: string, data: FormData) => Promise<void>;
  getCoachPrograms: () => Promise<void>;
  deleteProgram: (programId: string) => Promise<void>;
  getCoachProgress: () => Promise<void>;

  // client
  getClientPrograms: (userId: string) => Promise<void>;
  getClientProgress: (programId: string) => Promise<void>;
 updateClientProgress: (
  progressId: string,
  exercises: any[]
) => Promise<void>;


  getClientDashboard: () => Promise<any>;
}

/* =======================
   ZUSTAND STORE
======================= */

const useProgramStore = create<ProgramStore>((set, get) => ({
  loading: false,
  error: null,

  programs: [],
  progress: [],
  clients: [],

  /* =======================
     COACH ACTIONS
  ======================= */

  getClients: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/programs/clients");
      set({ clients: res.data });
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to load clients" });
    } finally {
      set({ loading: false });
    }
  },

  createProgram: async (data) => {
    try {
      set({ loading: true });
      const res = await api.post("/programs/coach/programs/create", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      set((state) => ({
        programs: [...state.programs, res.data],
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to create program" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateProgram: async (programId, data) => {
    try {
      set({ loading: true });
      const res = await api.put(`/programs/coach/programs/${programId}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      set((state) => ({
        programs: state.programs.map((p) => (p._id === programId ? res.data : p)),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to update program" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  getCoachPrograms: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/programs/coach/programs");
      set({ programs: res.data });
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to load programs" });
    } finally {
      set({ loading: false });
    }
  },

  deleteProgram: async (programId) => {
    try {
      set({ loading: true });
      await api.delete(`/programs/coach/programs/${programId}`);

      set((state) => ({
        programs: state.programs.filter((p) => p._id !== programId),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to delete program" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  getCoachProgress: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/programs/coach/progress");
      set({ progress: res.data });
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to load progress" });
    } finally {
      set({ loading: false });
    }
  },

  /* =======================
     CLIENT ACTIONS
  ======================= */

  getClientPrograms: async (userId) => {
    try {
      set({ loading: true });
      const res = await api.get(`/programs/client/programs/${userId}`);
      set({ programs: res.data });
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to load programs" });
    } finally {
      set({ loading: false });
    }
  },

  getClientProgress: async (programId) => {
    try {
      set({ loading: true });
      const res = await api.get(`/programs/client/progress/${programId}`);
      set({ progress: res.data });
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to load progress" });
    } finally {
      set({ loading: false });
    }
  },

  updateClientProgress: async (progressId, exercises) => {
  try {
    set({ loading: true });

    const res = await api.put(
      `/programs/client/progress/${progressId}`,
      { exercises }
    );

    set((state) => ({
      progress: state.progress.map((p) =>
        p._id === progressId ? res.data : p
      ),
    }));
  } catch (err: any) {
    set({ error: err.response?.data?.msg || "Failed to update progress" });
  } finally {
    set({ loading: false });
  }
},


  getClientDashboard: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/programs/client/dashboard");
      return res.data;
    } catch (err: any) {
      set({ error: err.response?.data?.msg || "Failed to load dashboard" });
      return null;
    } finally {
      set({ loading: false });
    }
  },
}));

export default useProgramStore;