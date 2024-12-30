import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";

type TauriStoreState = Record<string, unknown>;

const store = await load("store.json", { autoSave: false });

export const useTauriStore = create<TauriStoreState>((set, get) => ({
  data: null,
  get: async (key: keyof TauriStoreState) => {
    return store.get(key);
  },
}));
