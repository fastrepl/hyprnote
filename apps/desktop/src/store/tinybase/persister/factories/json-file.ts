import { sep } from "@tauri-apps/api/path";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as fs2Commands } from "@hypr/plugin-fs2";
import {
  commands as fsSyncCommands,
  type JsonValue,
} from "@hypr/plugin-fs-sync";
import { events as notifyEvents } from "@hypr/plugin-notify";
import { commands as settingsCommands } from "@hypr/plugin-settings";

import { StoreOrMergeableStore } from "../../store/shared";
import { isFileNotFoundError } from "../shared/fs";
import type { ChangedTables } from "../shared/types";
import { asTablesChanges, extractChangedTables } from "../shared/utils";

export type ListenMode = "notify" | "poll" | "both";

type ListenerHandle = {
  unlisten: (() => void) | null;
  interval: ReturnType<typeof setInterval> | null;
};

type TablesSchemaOf<S extends OptionalSchemas> = S extends [infer T, unknown]
  ? T
  : never;

export function createJsonFilePersister<
  Schemas extends OptionalSchemas,
  TName extends keyof TablesSchemaOf<Schemas> & string,
>(
  store: MergeableStore<Schemas>,
  options: {
    tableName: TName;
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
      saveContent<Schemas, TName>(store, changes, tableName, filename, label),
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
  // Return 3-tuple to use applyChanges() semantics (TinyBase checks content[2] === 1)
  return asTablesChanges({ [tableName]: data }) as any;
}

type TableId<S extends OptionalSchemas> = keyof TablesSchemaOf<S> & string;

async function saveContent<
  Schemas extends OptionalSchemas,
  TName extends TableId<Schemas>,
>(
  store: MergeableStore<Schemas>,
  changes:
    | PersistedChanges<Schemas, Persists.StoreOrMergeableStore>
    | undefined,
  tableName: TName,
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
    const baseResult = await settingsCommands.base();
    if (baseResult.status === "error") {
      throw new Error(baseResult.error);
    }
    const base = baseResult.data;
    const data = (store.getTable(tableName) ?? {}) as JsonValue;
    const path = [base, filename].join(sep());
    const result = await fsSyncCommands.writeJsonBatch([[data, path]]);
    if (result.status === "error") {
      throw new Error(result.error);
    }
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
      // Pass as changes (second param) with 3-tuple format for applyChanges() semantics
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
  const baseResult = await settingsCommands.base();
  if (baseResult.status === "error") {
    console.error(`[${label}] base error:`, baseResult.error);
    return undefined;
  }
  const base = baseResult.data;
  const path = [base, filename].join(sep());
  const result = await fs2Commands.readTextFile(path);

  if (result.status === "error") {
    if (!isFileNotFoundError(result.error)) {
      console.error(`[${label}] load error:`, result.error);
    }
    return undefined;
  }

  try {
    return JSON.parse(result.data);
  } catch (error) {
    console.error(`[${label}] JSON parse error:`, error);
    return undefined;
  }
}
