import { remove } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  PersistedChanges,
  PersistedContent,
  Persists,
} from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  commands as fsSyncCommands,
  type ParsedDocument,
} from "@hypr/plugin-fs-sync";

import { StoreOrMergeableStore } from "../../store/shared";
import { createNotifyListener } from "../shared/fs";
import { getDataDir } from "../shared/paths";
import {
  type ChangedTables,
  type CollectorResult,
  extractChangedTables,
  type JsonValue,
  type TablesContent,
  type WriteOperation,
} from "../shared/types";

type CategorizedOperations = {
  json: Array<[JsonValue, string]>;
  document: Array<[ParsedDocument, string]>;
  delete: string[];
};

type NotifyListenerHandle = {
  unlisten: (() => void) | null;
  interval: ReturnType<typeof setInterval> | null;
};

export function createCollectorPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: {
    label: string;
    collect: (
      store: MergeableStore<Schemas>,
      tables: TablesContent,
      dataDir: string,
      changedTables?: ChangedTables,
    ) => CollectorResult;
    load?: () => Promise<Content<Schemas> | undefined>;
    postSave?: (dataDir: string, result: CollectorResult) => Promise<void>;
    postSaveAlways?: boolean;
    watchPaths?: string[];
    watchIntervalMs?: number;
  },
) {
  const loadFn = options.load ?? (async () => undefined);

  const notifyListener = options.watchPaths
    ? createNotifyListener(
        (path) => options.watchPaths!.some((p) => path.startsWith(p)),
        options.watchIntervalMs ?? 30000,
      )
    : null;

  const saveFn = async (
    _getContent: () => PersistedContent<
      Schemas,
      Persists.StoreOrMergeableStore
    >,
    changes?: PersistedChanges<Schemas, Persists.StoreOrMergeableStore>,
  ) => {
    const changedTables = extractChangedTables<Schemas>(changes);
    const isIncrementalSave = changedTables !== null;

    try {
      const dataDir = await getDataDir();
      const tables = store.getTables() as TablesContent | undefined;
      const result = options.collect(
        store,
        tables ?? {},
        dataDir,
        changedTables ?? undefined,
      );
      const { operations } = result;

      if (operations.length === 0) {
        return;
      }

      const categorized = categorizeOperations(operations);

      await writeJsonBatch(categorized.json, options.label);
      await writeDocumentBatch(categorized.document, options.label);
      await deleteFiles(categorized.delete, options.label);

      const shouldRunPostSave = options.postSaveAlways || !isIncrementalSave;
      if (options.postSave && shouldRunPostSave) {
        await options.postSave(dataDir, result);
      }
    } catch (error) {
      console.error(`[${options.label}] save error:`, error);
    }
  };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    (listener) => {
      if (!notifyListener) return null;
      return notifyListener.addListener(() => listener());
    },
    (handle: NotifyListenerHandle | null) => {
      if (handle && notifyListener) {
        notifyListener.delListener(handle);
      }
    },
    (error) => console.error(`[${options.label}]:`, error),
    StoreOrMergeableStore,
  );
}

function categorizeOperations(
  operations: WriteOperation[],
): CategorizedOperations {
  const result: CategorizedOperations = {
    json: [],
    document: [],
    delete: [],
  };

  for (const op of operations) {
    if (op.type === "json") {
      result.json.push([op.content as JsonValue, op.path]);
    } else if (op.type === "document-batch") {
      result.document = result.document.concat(op.items);
    } else if (op.type === "delete") {
      result.delete.push(op.path);
    } else if (op.type === "delete-batch") {
      result.delete = result.delete.concat(op.paths);
    }
  }

  return result;
}

async function writeJsonBatch(
  items: Array<[JsonValue, string]>,
  label: string,
): Promise<void> {
  if (items.length === 0) return;

  const result = await fsSyncCommands.writeJsonBatch(items);
  if (result.status === "error") {
    console.error(`[${label}] Failed to export json batch:`, result.error);
  }
}

async function writeDocumentBatch(
  items: Array<[ParsedDocument, string]>,
  label: string,
): Promise<void> {
  if (items.length === 0) return;

  const result = await fsSyncCommands.writeDocumentBatch(items);
  if (result.status === "error") {
    console.error(`[${label}] Failed to write document batch:`, result.error);
  }
}

async function deleteFiles(paths: string[], label: string): Promise<void> {
  if (paths.length === 0) return;

  for (const path of paths) {
    try {
      await remove(path);
    } catch (error) {
      const errorStr = String(error);
      if (!errorStr.includes("No such file") && !errorStr.includes("ENOENT")) {
        console.error(`[${label}] Failed to delete file ${path}:`, error);
      }
    }
  }
}
