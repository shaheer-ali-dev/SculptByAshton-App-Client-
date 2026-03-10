/**
 * utils/storage.ts
 * ✅ Cross-platform storage:
 *    - Native (iOS/Android) → expo-secure-store
 *    - Web                  → localStorage
 */

import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { Platform } from "react-native";

export const Storage = {
  get: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return getItemAsync(key);
  },

  set: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await setItemAsync(key, value);
  },

  remove: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await deleteItemAsync(key);
  },
};