import { create } from "zustand";
import { load, Store } from "@tauri-apps/plugin-store";

type TauriStoreData = {
  locale: "en" | "ko";
  key?: string;
};

const defaultStoreData: TauriStoreData = {
  locale: "en",
};

export const useTauriStore = create<
  TauriStoreData & {
    _store: Store | null;
    load: () => Promise<void>;
    setKey: (key: TauriStoreData["key"]) => void;
    setLocale: (locale: TauriStoreData["locale"]) => void;
  }
>((set) => ({
  ...defaultStoreData,
  _store: null,
  load: async () => {
    const store = await load("store.json", { autoSave: false });

    const key = (await store.get("key")) as TauriStoreData["key"];
    const locale = ((await store.get("locale")) ||
      "en") as TauriStoreData["locale"];

    set((state) => ({ ...state, _store: store, locale, key }));
  },
  setKey: (key: TauriStoreData["key"]) => {
    set((state) => {
      state._store?.set("key", key);
      return { ...state, key };
    });
  },
  setLocale: (locale: TauriStoreData["locale"]) => {
    set((state) => {
      state._store?.set("locale", locale);
      return { ...state, locale };
    });
  },
}));
