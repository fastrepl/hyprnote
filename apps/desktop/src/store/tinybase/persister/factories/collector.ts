import { writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  commands as fsSyncCommands,
  type JsonValue as FsSyncJsonValue,
  type ParsedDocument,
} from "@hypr/plugin-fs-sync";

import { StoreOrMergeableStore } from "../../store/shared";
import { ensureDirsExist } from "../shared/fs";
import { getDataDir } from "../shared/paths";
import {
  type ChangedTables,
  type CollectorResult,
  extractChangedTables,
  type TablesContent,
} from "../shared/types";

export function createModeAwarePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: {
    label: string;
    load: () => Promise<Content<Schemas> | undefined>;
    save: () => Promise<void>;
  },
) {
  return createCustomPersister(
    store,
    options.load,
    options.save,
    () => null,
    () => {},
    (error) => console.error(`[${options.label}]:`, error),
    StoreOrMergeableStore,
  );
}

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

  const saveFn = async (_getContent: () => unknown, changes?: unknown) => {
    const changedTables = extractChangedTables(changes);
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

      const jsonBatchItems: Array<[FsSyncJsonValue, string]> = [];
      let documentBatchItems: Array<[ParsedDocument, string]> = [];
      const textItems: Array<{ path: string; content: string }> = [];

      for (const op of operations) {
        if (op.type === "json") {
          jsonBatchItems.push([op.content as FsSyncJsonValue, op.path]);
        } else if (op.type === "document-batch") {
          documentBatchItems = documentBatchItems.concat(op.items);
        } else if (op.type === "text") {
          textItems.push({ path: op.path, content: op.content });
        }
      }

      if (jsonBatchItems.length > 0) {
        const exportResult =
          await fsSyncCommands.writeJsonBatch(jsonBatchItems);
        if (exportResult.status === "error") {
          console.error(
            `[${options.label}] Failed to export json batch:`,
            exportResult.error,
          );
        }
      }

      if (documentBatchItems.length > 0) {
        const result =
          await fsSyncCommands.writeDocumentBatch(documentBatchItems);
        if (result.status === "error") {
          console.error(
            `[${options.label}] Failed to write document batch:`,
            result.error,
          );
        }
      }

      for (const item of textItems) {
        try {
          await writeTextFile(item.path, item.content);
        } catch (e) {
          console.error(
            `[${options.label}] Failed to write text file ${item.path}:`,
            e,
          );
        }
      }

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
