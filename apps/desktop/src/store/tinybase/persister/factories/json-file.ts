import { sep } from "@tauri-apps/api/path";
import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { events as notifyEvents } from "@hypr/plugin-notify";
import { commands as path2Commands } from "@hypr/plugin-path2";

import { StoreOrMergeableStore } from "../../store/shared";
import { isFileNotFoundError } from "../shared/fs";
import {
  asTablesChanges,
  type ChangedTables,
  extractChangedTables,
} from "../shared/types";

export type ListenMode = "notify" | "poll" | "both";

type ListenerHandle = {
  unlisten: (() => void) | null;
  interval: ReturnType<typeof setInterval> | null;
};

export function createJsonFilePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: {
    tableName: string;
    filename: string;
    label: string;
    listenMode?: ListenMode;
    pollIntervalMs?: number;
  },
) {
  const {
    tableName,
    filename,
    label,
    listenMode = "poll",
    pollIntervalMs = 3000,
  } = options;

  return createCustomPersister(
    store,
    async () => loadContent(filename, tableName, label),
    async (_, changes) =>
      saveContent(store, changes, tableName, filename, label),
    (listener) =>
      addListener(
        listener,
        filename,
        tableName,
        label,
        listenMode,
        pollIntervalMs,
      ),
    delListener,
    (error) => console.error(`[${label}]:`, error),
    StoreOrMergeableStore,
  );
}

async function loadContent(filename: string, tableName: string, label: string) {
  const data = await loadTableData(filename, label);
  if (!data) return undefined;
  return asTablesChanges({ [tableName]: data }) as any;
}

async function saveContent<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  changes:
    | PersistedChanges<Schemas, Persists.StoreOrMergeableStore>
    | undefined,
  tableName: string,
  filename: string,
  label: string,
) {
  if (changes) {
    const changedTables = extractChangedTables<Schemas>(changes);
    if (changedTables && !changedTables[tableName as keyof ChangedTables]) {
      return;
    }
  }

  try {
    const base = await path2Commands.base();
    await mkdir(base, { recursive: true });
    const data = (store.getTable(tableName as any) ?? {}) as Record<
      string,
      unknown
    >;
    await writeTextFile(
      [base, filename].join(sep()),
      JSON.stringify(data, null, 2),
    );
  } catch (error) {
    console.error(`[${label}] save error:`, error);
  }
}

function addListener(
  listener: (content?: any, changes?: any) => void,
  filename: string,
  tableName: string,
  label: string,
  listenMode: ListenMode,
  pollIntervalMs: number,
): ListenerHandle {
  const handle: ListenerHandle = { unlisten: null, interval: null };

  const onFileChange = async () => {
    const data = await loadTableData(filename, label);
    if (data) {
      listener(undefined, asTablesChanges({ [tableName]: data }) as any);
    }
  };

  if (listenMode === "notify" || listenMode === "both") {
    (async () => {
      const unlisten = await notifyEvents.fileChanged.listen((event) => {
        if (event.payload.path.endsWith(filename)) {
          onFileChange();
        }
      });
      handle.unlisten = unlisten;
    })().catch((error) => {
      console.error(`[${label}] Failed to setup notify listener:`, error);
    });
  }

  if (listenMode === "poll" || listenMode === "both") {
    handle.interval = setInterval(onFileChange, pollIntervalMs);
  }

  return handle;
}

function delListener(handle: ListenerHandle) {
  handle.unlisten?.();
  if (handle.interval) clearInterval(handle.interval);
}

async function loadTableData(
  filename: string,
  label: string,
): Promise<Record<string, Record<string, unknown>> | undefined> {
  try {
    const base = await path2Commands.base();
    const content = await readTextFile([base, filename].join(sep()));
    return JSON.parse(content);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${label}] load error:`, error);
    }
    return undefined;
  }
}
