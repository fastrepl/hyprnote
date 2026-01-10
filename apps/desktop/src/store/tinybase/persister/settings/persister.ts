import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { Content } from "tinybase/with-schemas";

import { commands } from "@hypr/plugin-settings";

import type { Schemas, Store } from "../../store/settings";
import { StoreOrMergeableStore } from "../../store/shared";
import { createFileListener } from "../shared/listener";
import { settingsToContent, storeToSettings } from "./transform";

const SETTINGS_FILENAME = "settings.json";

const settingsNotifyListener = createFileListener({
  mode: "simple",
  pathMatcher: (path) => path.endsWith(SETTINGS_FILENAME),
});

export const createSettingsPersister = createPersisterBuilder({
  toStore: settingsToContent,
  fromStore: storeToSettings,
});

interface TransformUtils<T> {
  toStore: (data: T) => Content<Schemas>;
  fromStore: (store: Store) => T;
}

function createPersisterBuilder<T>(transform: TransformUtils<T>) {
  return (store: Store) =>
    createCustomPersister(
      store,
      async () => {
        const result = await commands.load();
        if (result.status === "error") {
          console.error("[SettingsPersister] load error:", result.error);
          return undefined;
        }
        return transform.toStore(result.data as T);
      },
      async () => {
        const settings = transform.fromStore(store);
        const result = await commands.save(
          settings as Parameters<typeof commands.save>[0],
        );
        if (result.status === "error") {
          console.error("[SettingsPersister] save error:", result.error);
        }
      },
      (listener) => settingsNotifyListener.addListener(listener),
      (handle) => settingsNotifyListener.delListener(handle),
      (error) => console.error("[SettingsPersister]:", error),
      StoreOrMergeableStore,
    );
}
