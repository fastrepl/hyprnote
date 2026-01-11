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
import {
  createFileListener,
  type NotifyListenerHandle,
} from "../shared/listener";
import { getDataDir } from "../shared/paths";
import {
  type ChangedTables,
  type JsonValue,
  type SaveResult,
  type TablesContent,
} from "../shared/types";
import { extractChangedTables } from "../shared/utils";

type LoadSingleFn<Schemas extends OptionalSchemas> = (
  entityId: string,
) => Promise<
  PersistedChanges<Schemas, Persists.StoreOrMergeableStore> | undefined
>;

type OrphanCleanupDirs = {
  type: "dirs";
  subdir: string;
  markerFile: string;
  keepIds: string[];
};

type OrphanCleanupFiles = {
  type: "files";
  subdir: string;
  extension: string;
  keepIds: string[];
};

type OrphanCleanupFilesRecursive = {
  type: "filesRecursive";
  subdir: string;
  markerFile: string;
  extension: string;
  keepIds: string[];
};

export type OrphanCleanupConfig =
  | OrphanCleanupDirs
  | OrphanCleanupFiles
  | OrphanCleanupFilesRecursive;

type BaseCollectorOptions<Schemas extends OptionalSchemas> = {
  label: string;
  save: (
    store: MergeableStore<Schemas>,
    tables: TablesContent,
    dataDir: string,
    changedTables?: ChangedTables,
  ) => SaveResult;
  load?: () => Promise<Content<Schemas> | undefined>;
  cleanup?: (tables: TablesContent) => OrphanCleanupConfig[];
  watchPaths?: string[];
  watchIntervalMs?: number;
};

type CollectorOptionsWithEntityLoading<Schemas extends OptionalSchemas> =
  BaseCollectorOptions<Schemas> & {
    loadSingle: LoadSingleFn<Schemas>;
    entityParser: (path: string) => string | null;
  };

type CollectorOptionsWithoutEntityLoading<Schemas extends OptionalSchemas> =
  BaseCollectorOptions<Schemas> & {
    loadSingle?: never;
    entityParser?: never;
  };

export type CollectorOptions<Schemas extends OptionalSchemas> =
  | CollectorOptionsWithEntityLoading<Schemas>
  | CollectorOptionsWithoutEntityLoading<Schemas>;

export function createCollectorPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: CollectorOptions<Schemas>,
) {
  const loadFn = options.load ?? (async () => undefined);

  const pathMatcher = (path: string) =>
    options.watchPaths?.some((p) => path.startsWith(p)) ?? false;

  const useEntityMode =
    options.watchPaths && options.loadSingle && options.entityParser;

  const fileListener = options.watchPaths
    ? useEntityMode
      ? createFileListener({
          mode: "entity",
          pathMatcher,
          entityParser: options.entityParser!,
        })
      : createFileListener({
          mode: "simple",
          pathMatcher,
          fallbackIntervalMs: options.watchIntervalMs ?? 30000,
        })
    : null;

  const saveFn = async (
    _getContent: () => PersistedContent<
      Schemas,
      Persists.StoreOrMergeableStore
    >,
    changes?: PersistedChanges<Schemas, Persists.StoreOrMergeableStore>,
  ) => {
    const changedTables = extractChangedTables<Schemas>(changes);

    try {
      const dataDir = await getDataDir();
      const tables = store.getTables() as TablesContent | undefined;
      const result = options.save(
        store,
        tables ?? {},
        dataDir,
        changedTables ?? undefined,
      );
      const { operations } = result;

      if (operations.length > 0) {
        const jsonItems: Array<[JsonValue, string]> = [];
        const documentItems: Array<[ParsedDocument, string]> = [];
        const deletePaths: string[] = [];

        for (const op of operations) {
          if (op.type === "write-json") {
            jsonItems.push([op.content as JsonValue, op.path]);
          } else if (op.type === "write-document-batch") {
            documentItems.push(...op.items);
          } else if (op.type === "delete") {
            deletePaths.push(...op.paths);
          }
        }

        await writeJsonBatch(jsonItems, options.label);
        await writeDocumentBatch(documentItems, options.label);
        await deleteFiles(deletePaths, options.label);
      }

      if (options.cleanup) {
        const cleanupConfigs = options.cleanup(tables ?? {});
        await runOrphanCleanup(cleanupConfigs, options.label);
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
      if (!fileListener) return null;

      if (useEntityMode && options.loadSingle) {
        const entityFileListener = fileListener as ReturnType<
          typeof createFileListener<{
            mode: "entity";
            pathMatcher: typeof pathMatcher;
            entityParser: NonNullable<typeof options.entityParser>;
          }>
        >;
        return entityFileListener.addListener(async ({ entityId }) => {
          try {
            const changes = await options.loadSingle!(entityId);
            if (changes) {
              listener(undefined, changes);
            }
          } catch (error) {
            console.error(
              `[${options.label}] loadSingle error for ${entityId}:`,
              error,
            );
            listener();
          }
        });
      }

      const simpleFileListener = fileListener as ReturnType<
        typeof createFileListener<{
          mode: "simple";
          pathMatcher: typeof pathMatcher;
        }>
      >;
      return simpleFileListener.addListener(() => listener());
    },
    (handle: NotifyListenerHandle | null) => {
      if (handle && fileListener) {
        fileListener.delListener(handle);
      }
    },
    (error) => console.error(`[${options.label}]:`, error),
    StoreOrMergeableStore,
  );
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

async function runOrphanCleanup(
  configs: OrphanCleanupConfig[],
  label: string,
): Promise<void> {
  for (const config of configs) {
    if (config.keepIds.length === 0) {
      continue;
    }

    try {
      if (config.type === "dirs") {
        await fsSyncCommands.cleanupOrphan(
          {
            type: "dirs",
            subdir: config.subdir,
            marker_file: config.markerFile,
          },
          config.keepIds,
        );
      } else if (config.type === "files") {
        await fsSyncCommands.cleanupOrphan(
          { type: "files", subdir: config.subdir, extension: config.extension },
          config.keepIds,
        );
      } else if (config.type === "filesRecursive") {
        await fsSyncCommands.cleanupOrphan(
          {
            type: "filesRecursive",
            subdir: config.subdir,
            marker_file: config.markerFile,
            extension: config.extension,
          },
          config.keepIds,
        );
      }
    } catch (error) {
      console.error(`[${label}] Cleanup error for ${config.type}:`, error);
    }
  }
}
