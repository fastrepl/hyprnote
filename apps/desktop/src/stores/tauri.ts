import { create } from "zustand";
import { load, Store } from "@tauri-apps/plugin-store";

type TauriStoreData = {
  locale: "en" | "ko";
  key?: string;
};

// @ts-ignore
let store: Store = null;

load("store.json", { autoSave: false }).then((s) => {
  store = s;
});

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
