// Updated store types: user is optional (runtime can return unpopulated post)
import { create } from "zustand";
import api from "../utils/api";

/* TYPES */
export interface Post {
  _id: string;
  user?: { // made optional
    _id: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  imageUrl: string;
  title?: string;
  description?: string;
  createdAt: string;
}

interface PostState {
  posts: Post[];
  userPosts: Post[];
  loading: boolean;
  error: string | null;

  fetchFeed: () => Promise<void>;
  fetchUserPosts: (userId: string) => Promise<void>;
  createPost: (data: FormData) => Promise<void>;
}

/* STORE */
export const usePostStore = create<PostState>((set) => ({
  posts: [],
  userPosts: [],
  loading: false,
  error: null,

  fetchFeed: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/posts");
      // ensure posts is an array and filter out falsy entries
      const posts = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
      set({ posts, loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to load feed",
      });
    }
  },

  fetchUserPosts: async (userId) => {
    try {
      set({ loading: true, error: null });
      const res = await api.get(`/posts/user/${userId}`);
      const userPosts = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
      set({ userPosts, loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.msg || "Failed to load user posts",
      });
    }
  },

  createPost: async (formData) => {
  try {
    set({ loading: true, error: null });

    const res = await api.post("/posts", formData); // <- remove headers

    if (res?.data) {
      set((state) => ({ posts: [res.data, ...state.posts], loading: false }));
    } else {
      set({ loading: false });
    }
  } catch (err: any) {
    set({
      loading: false,
      error: err?.response?.data?.msg || "Failed to create post",
    });
  }
},

}));