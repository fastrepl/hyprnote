import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";

type TauriStoreData = {
  locale: "en" | "ko";
};

const store = await load("store.json", { autoSave: false });

const defaultStoreData: TauriStoreData = {
  locale: "en",
};

const storeOperation = {
  get: async (key: keyof TauriStoreData) => {
    return store.get(key);
  },
  set: async (key: keyof TauriStoreData, value: string) => {
    return store.set(key, value);
  },
};

export const useTauriStore = create<TauriStoreData & typeof storeOperation>(
  (set) => ({
    ...defaultStoreData,
    ...storeOperation,
    load: async () => {
      const locale = ((await storeOperation.get("locale")) ||
        "en") as TauriStoreData["locale"];
        
      set((state) => ({ ...state, locale }));
    },
    setLocale: (locale: TauriStoreData["locale"]) => {
      set((state) => ({ ...state, locale }));
    },
  }),
);
