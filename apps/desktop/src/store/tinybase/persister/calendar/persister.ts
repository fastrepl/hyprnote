import { sep } from "@tauri-apps/api/path";
import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as path2Commands } from "@hypr/plugin-path2";

import { StoreOrMergeableStore } from "../../store/shared";
import {
  asTableChanges,
  createNotifyListener,
  isFileNotFoundError,
} from "../utils";

const TABLE_NAME = "calendars";
const FILENAME = "calendars.json";

async function loadCalendarsData(): Promise<
  Record<string, Record<string, unknown>> | undefined
> {
  try {
    const base = await path2Commands.base();
    const content = await readTextFile([base, FILENAME].join(sep()));
    return JSON.parse(content);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error("[CalendarPersister] load error:", error);
    }
    return undefined;
  }
}

export function createCalendarPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  const notifyListener = createNotifyListener((path) =>
    path.endsWith(FILENAME),
  );

  return createCustomPersister(
    store,
    async () => {
      const data = await loadCalendarsData();
      if (!data) return undefined;
      return asTableChanges(TABLE_NAME, data) as any;
    },
    async (_getContent) => {
      try {
        const base = await path2Commands.base();
        await mkdir(base, { recursive: true });
        const data = (store.getTable(TABLE_NAME as any) ?? {}) as Record<
          string,
          unknown
        >;
        await writeTextFile(
          [base, FILENAME].join(sep()),
          JSON.stringify(data, null, 2),
        );
      } catch (error) {
        console.error("[CalendarPersister] save error:", error);
      }
    },
    (listener) => {
      return notifyListener.addListener(async () => {
        const data = await loadCalendarsData();
        if (data) {
          listener(undefined, asTableChanges(TABLE_NAME, data) as any);
        }
      });
    },
    notifyListener.delListener,
    (error) => console.error("[CalendarPersister]:", error),
    StoreOrMergeableStore,
  );
}
