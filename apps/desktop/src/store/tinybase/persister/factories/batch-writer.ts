/**
 * Batch writer factories for multi-format file persistence.
 *
 * Provides factories that batch multiple file write operations across different formats
 * (JSON, Markdown, frontmatter, text). Use when persisting complex multi-table data
 * that requires writing multiple files atomically.
 *
 * @example Session persister (multiple tables → multiple files per session)
 * @example Chat persister (messages + metadata → multiple files)
 */
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
  type MdContent,
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
  md: Array<[MdContent, string]>;
};

/**
 * Creates a persister that batches file writes across multiple formats.
 *
 * The `collect` function transforms store tables into write operations,
 * which are then executed in batches for efficiency.
 *
 * Supported formats: JSON, Markdown, frontmatter (YAML + content), plain text.
 */
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
      await writeMdBatch(categorized.md, options.label);

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
    md: [],
  };

  for (const op of operations) {
    if (op.type === "json") {
      result.json.push([op.content as JsonValue, op.path]);
    } else if (op.type === "md-batch") {
      result.md = result.md.concat(op.items);
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

async function writeMdBatch(
  items: Array<[MdContent, string]>,
  label: string,
): Promise<void> {
  if (items.length === 0) return;

  const result = await fsSyncCommands.writeMdBatch(items);
  if (result.status === "error") {
    console.error(`[${label}] Failed to export md batch:`, result.error);
  }
}
