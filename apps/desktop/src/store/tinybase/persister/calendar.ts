import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { commands as path2Commands } from "@hypr/plugin-path2";
import type { CalendarStorage } from "@hypr/store";

import { StoreOrMergeableStore } from "../store/shared";
import type { PersisterMode } from "./utils";

const FILENAME = "calendars.json";

type CalendarsJson = Record<string, CalendarStorage>;

async function getFilePath(): Promise<string> {
  const base = await path2Commands.base();
  return `${base}/${FILENAME}`;
}

export function jsonToContent<Schemas extends OptionalSchemas>(
  data: CalendarsJson,
): Content<Schemas> {
  return [{ calendars: data }, {}] as unknown as Content<Schemas>;
}

export function storeToJson<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
): CalendarsJson {
  const table = store.getTable("calendars") ?? {};
  return table as unknown as CalendarsJson;
}

export function createCalendarPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "load-and-save" },
) {
  const loadFn =
    config.mode === "save-only"
      ? async (): Promise<Content<Schemas> | undefined> => undefined
      : async (): Promise<Content<Schemas> | undefined> => {
          try {
            const filePath = await getFilePath();
            const content = await readTextFile(filePath);
            const data = JSON.parse(content) as CalendarsJson;
            return jsonToContent<Schemas>(data);
          } catch (error) {
            const errorStr = String(error);
            if (
              errorStr.includes("No such file or directory") ||
              errorStr.includes("ENOENT") ||
              errorStr.includes("not found")
            ) {
              return jsonToContent<Schemas>({});
            }
            console.error("[CalendarPersister] load error:", error);
            return undefined;
          }
        };

  const saveFn =
    config.mode === "load-only"
      ? async () => {}
      : async () => {
          try {
            const data = storeToJson(store);
            const filePath = await getFilePath();
            await writeTextFile(filePath, JSON.stringify(data, null, 2));
          } catch (error) {
            console.error("[CalendarPersister] save error:", error);
          }
        };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    (listener) => setInterval(listener, 1000),
    (handle) => clearInterval(handle),
    (error) => console.error("[CalendarPersister]:", error),
    StoreOrMergeableStore,
  );
}
