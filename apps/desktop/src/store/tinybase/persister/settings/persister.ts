import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { commands } from "@hypr/plugin-settings";

import { StoreOrMergeableStore } from "../../store/shared";
import { createNotifyListener } from "../shared/fs";
import { settingsToContent, storeToSettings } from "./transform";

const SETTINGS_FILENAME = "settings.json";

const settingsNotifyListener = createNotifyListener((path) =>
  path.endsWith(SETTINGS_FILENAME),
);

export const createSettingsPersister = createPersisterBuilder({
  toStore: settingsToContent,
  fromStore: storeToSettings,
});

interface TransformUtils<T, Schemas extends OptionalSchemas> {
  toStore: (data: T) => Content<Schemas>;
  fromStore: (store: MergeableStore<Schemas>) => T;
}

function createPersisterBuilder<T, Schemas extends OptionalSchemas>(
  transform: TransformUtils<T, Schemas>,
) {
  return (store: MergeableStore<Schemas>) =>
    createCustomPersister(
      store,
      async (): Promise<Content<Schemas> | undefined> => {
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
