import { create } from "zustand";
import api from "../utils/api";
import { io, Socket } from "socket.io-client";

/* Types (add call-related) */
export interface Message {
  _id?: string;
  sender: string;
  receiver: string;
  type?: "text" | "voice";
  text?: string;
  audio?: {
    filePath: string;
    duration: number;
  };
  createdAt?: string;
}

export interface CoachProfile {
  coachId: string;
  name: string;
  email: string;
  profileImage?: string | null;
}

interface IncomingCall {
  from: string;
  metadata?: any;
}

interface SignalingOffer {
  from: string;
  offer: any; // SDP
}

interface SignalingAnswer {
  from: string;
  answer: any; // SDP
}

interface SignalingIce {
  from: string;
  candidate: any;
}

interface ChatState {
  socket: Socket | null;
  currentUserId: string | null;
  messages: Record<string, Message[]>;
  onlineUsers: string[];
  coachProfile: CoachProfile | null;
  clients: { _id: string; name: string }[];
  loading: boolean;
  error: string | null;

  // call/signaling state
  incomingCall: IncomingCall | null;
  lastOffer: SignalingOffer | null;
  lastAnswer: SignalingAnswer | null;
  lastIce: SignalingIce | null;

  // actions
  getMyId: () => Promise<string | null>;
  initSocket: () => Promise<void>;
  sendMessage: (receiver: string, text: string) => void;
  receiveMessage: (message: Message) => void;
  fetchMessages: (partnerId: string) => Promise<void>;
  fetchClients: () => Promise<void>;
  sendVoiceMessage: (receiver: string, voiceFileUri: string, duration: number) => Promise<void>;
  fetchCoachProfile: () => Promise<void>;
  setOnlineUsers: (users: string[]) => void;

  // call helpers (emitters)
  emitCallInit: (to: string, metadata?: any) => void;
  emitOffer: (to: string, offer: any) => void;
  emitAnswer: (to: string, answer: any) => void;
  emitIce: (to: string, candidate: any) => void;
  emitCallEnd: (to: string) => void;
  clearCallSignals: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  currentUserId: null,
  messages: {},
  onlineUsers: [],
  clients: [],
  loading: false,
  error: null,
  coachProfile: null,

  incomingCall: null,
  lastOffer: null,
  lastAnswer: null,
  lastIce: null,

  initSocket: async () => {
    if (get().socket) {
      console.log("initSocket: socket already exists, skipping init.");
      return;
    }

    try {
      const userId = await get().getMyId();
      if (!userId) {
        console.error("initSocket: userId not found");
        return;
      }

      const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        socket.emit("join", userId);
      });

      socket.on("receiveMessage", (message: Message) => {
        get().receiveMessage(message);
      });

      socket.on("onlineUsers", (users: string[]) => {
        get().setOnlineUsers(users);
      });

      // ---- Call signaling listeners ----
      socket.on("call:init", (payload: { from: string; metadata?: any }) => {
        console.log("incoming call init", payload);
        set({ incomingCall: { from: payload.from, metadata: payload.metadata } });
      });

      socket.on("call:offer", (payload: { from: string; offer: any }) => {
        console.log("received offer", payload);
        set({ lastOffer: { from: payload.from, offer: payload.offer } });
      });

      socket.on("call:answer", (payload: { from: string; answer: any }) => {
        console.log("received answer", payload);
        set({ lastAnswer: { from: payload.from, answer: payload.answer } });
      });

      socket.on("call:ice", (payload: { from: string; candidate: any }) => {
        // candidates will be streamed often
        set({ lastIce: { from: payload.from, candidate: payload.candidate } });
      });

      socket.on("call:end", (payload: { from: string }) => {
        console.log("call ended by remote", payload);
        // let UI know to tear down
        set({ incomingCall: null, lastOffer: null, lastAnswer: null, lastIce: null });
      });

      socket.on("call:unavailable", (payload: any) => {
        console.warn("call unavailable", payload);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connect_error:", err);
      });

      socket.on("disconnect", (reason) => {
        console.warn("Socket disconnected:", reason);
      });

      set({ socket, currentUserId: userId });
      console.log("initSocket success with userId:", userId);
    } catch (err) {
      console.error("initSocket error:", err);
    }
  },

  getMyId: async () => {
    try {
      console.log("getMyId: calling /messages/me");
      const res = await api.get("/messages/me");
      const userId = res?.data?.userId;
      console.log("getMyId response:", userId);
      return userId || null;
    } catch (err: any) {
      console.error("getMyId error:", err?.response?.data || err);
      return null;
    }
  },

  sendMessage: (receiver, text) => {
    const { socket, messages, currentUserId } = get();
    if (!socket || !currentUserId) return;
    const message: Message = {
      sender: currentUserId,
      receiver,
      text,
      createdAt: new Date().toISOString(),
    };
    socket.emit("sendMessage", message);
    set({
      messages: {
        ...messages,
        [receiver]: [...(messages[receiver] || []), message],
      },
    });
  },

  sendVoiceMessage: async (receiver, voiceFileUri, duration) => {
    const { messages, currentUserId } = get();
    if (!currentUserId) return;
    try {
      const formData = new FormData();
      formData.append("receiver", receiver);
      formData.append("duration", duration.toString());
      formData.append("voice", {
        uri: voiceFileUri,
        type: "audio/m4a",
        name: `voice_${Date.now()}.m4a`,
      } as any);
      const res = await api.post("/messages/send-voice", formData);
      const message: Message = res.data;
      set({
        messages: {
          ...messages,
          [receiver]: [...(messages[receiver] || []), message],
        },
      });
    } catch (err: any) {
      console.error("sendVoiceMessage error:", err?.response?.data || err);
    }
  },

  receiveMessage: (message) => {
    const { messages, currentUserId } = get();
    const partnerId = message.sender === currentUserId ? message.receiver : message.sender;
    set({
      messages: {
        ...messages,
        [partnerId]: [...(messages[partnerId] || []), message],
      },
    });
  },

  fetchMessages: async (partnerId) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/messages/conversation/${partnerId}`);
      set((state) => ({
        messages: { ...state.messages, [partnerId]: res.data },
        loading: false,
      }));
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to fetch messages",
      });
    }
  },

  fetchClients: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/messages/clients");
      set({ clients: res.data, loading: false });
    } catch (err: any) {
      set({ loading: false });
    }
  },

  fetchCoachProfile: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/messages/client/coach");
      set({ coachProfile: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  // signaling emitters
  emitCallInit: (to, metadata) => {
    const s = get().socket;
    const from = get().currentUserId;
    if (!s || !from) return;
    s.emit("call:init", { to, from, metadata });
  },

  emitOffer: (to, offer) => {
    const s = get().socket;
    const from = get().currentUserId;
    if (!s || !from) return;
    s.emit("call:offer", { to, from, offer });
  },

  emitAnswer: (to, answer) => {
    const s = get().socket;
    const from = get().currentUserId;
    if (!s || !from) return;
    s.emit("call:answer", { to, from, answer });
  },

  emitIce: (to, candidate) => {
    const s = get().socket;
    const from = get().currentUserId;
    if (!s || !from) return;
    s.emit("call:ice", { to, from, candidate });
  },

  emitCallEnd: (to) => {
    const s = get().socket;
    const from = get().currentUserId;
    if (!s || !from) return;
    s.emit("call:end", { to, from });
  },

  clearCallSignals: () => {
    set({ incomingCall: null, lastOffer: null, lastAnswer: null, lastIce: null });
  },
}));