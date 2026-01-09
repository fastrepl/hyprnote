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
import { ensureDirsExist } from "../shared/fs";
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
  },
) {
  const loadFn = options.load ?? (async () => undefined);

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
      const { dirs, operations } = result;

      if (operations.length === 0) {
        return;
      }

      await ensureDirsExist(dirs);

      const categorized = categorizeOperations(operations);

      await writeJsonBatch(categorized.json, options.label);
      await writeDocumentBatch(categorized.document, options.label);

      if (options.postSave && !isIncrementalSave) {
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
    () => null,
    () => {},
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
  };

  for (const op of operations) {
    if (op.type === "json") {
      result.json.push([op.content as JsonValue, op.path]);
    } else if (op.type === "document-batch") {
      result.document = result.document.concat(op.items);
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
