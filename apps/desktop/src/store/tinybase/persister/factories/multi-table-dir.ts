import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { toContent, toPersistedChanges } from "@hypr/tinybase-utils";

import {
  createDeletionMarker,
  type DeletionMarkerStore,
  type TableConfigEntry,
} from "../shared/deletion-marker";
import type { LoadResult } from "../shared/load-result";
import { getDataDir } from "../shared/paths";
import type { ChangedTables, SaveResult, TablesContent } from "../shared/types";
import {
  createCollectorPersister,
  type OrphanCleanupConfig,
} from "./collector";

type Table = Record<string, Record<string, unknown>>;

/**
 * Configuration for lazy loading behavior in multi-table dir persisters.
 * When provided, the factory handles metadata-only initial loading and on-demand content loading.
 */
export type LazyLoadingConfig<TLoadedData extends Record<string, Table>> = {
  /**
   * Load only metadata for all entities (fast startup).
   * This is called during initial persister.load().
   */
  loadMetadata: (dataDir: string) => Promise<LoadResult<TLoadedData>>;

  /**
   * Load full content for a specific entity (on-demand).
   * This is called when loadEntityContent is invoked.
   */
  loadContent: (
    dataDir: string,
    entityId: string,
  ) => Promise<LoadResult<TLoadedData>>;
};

/**
 * State tracking for lazy-loaded content.
 * Managed internally by the factory.
 */
export type ContentLoadState = {
  loaded: Set<string>;
  loading: Set<string>;
};

export type MultiTableDirConfig<
  Schemas extends OptionalSchemas,
  TLoadedData extends Record<string, Table>,
> = {
  label: string;
  dirName: string;
  entityParser: (path: string) => string | null;
  tables: TableConfigEntry<Schemas, TLoadedData>[];
  cleanup: (tables: TablesContent) => OrphanCleanupConfig[];
  loadAll: (dataDir: string) => Promise<LoadResult<TLoadedData>>;
  loadSingle: (
    dataDir: string,
    entityId: string,
  ) => Promise<LoadResult<TLoadedData>>;
  save: (
    store: MergeableStore<Schemas>,
    tables: TablesContent,
    dataDir: string,
    changedTables?: ChangedTables,
  ) => SaveResult;

  /**
   * Optional: Enable lazy loading for faster startup.
   * When provided, loadMetadata is used for initial load,
   * and loadContent is called on-demand when entities are accessed.
   */
  lazyLoading?: LazyLoadingConfig<TLoadedData>;
};

function hasChanges<TLoadedData extends Record<string, Table>>(
  result: { [K in keyof TLoadedData]: Record<string, unknown> },
  tableNames: (keyof TLoadedData)[],
): boolean {
  return tableNames.some((name) => Object.keys(result[name] ?? {}).length > 0);
}

/**
 * Result type for createMultiTableDirPersister when lazy loading is enabled.
 * Includes the persister plus lazy loading utilities.
 */
export type MultiTableDirPersisterWithLazyLoading<
  Schemas extends OptionalSchemas,
> = {
  persister: ReturnType<typeof createCollectorPersister<Schemas>>;
  /**
   * Load content for a specific entity on-demand.
   * Returns true if content was loaded, false if already loaded/loading.
   */
  loadEntityContent: (entityId: string) => Promise<boolean>;
  /**
   * Check if an entity's content is fully loaded.
   */
  isEntityContentLoaded: (entityId: string) => boolean;
  /**
   * Check if an entity's content is currently loading.
   */
  isEntityContentLoading: (entityId: string) => boolean;
  /**
   * Clear all content loading state (called on fresh load).
   */
  clearContentLoadState: () => void;
};

// Overload: with lazy loading config, returns result with utilities
export function createMultiTableDirPersister<
  Schemas extends OptionalSchemas,
  TLoadedData extends Record<string, Table>,
>(
  store: MergeableStore<Schemas>,
  config: MultiTableDirConfig<Schemas, TLoadedData> & {
    lazyLoading: LazyLoadingConfig<TLoadedData>;
  },
): MultiTableDirPersisterWithLazyLoading<Schemas>;

// Overload: without lazy loading config, returns persister directly
export function createMultiTableDirPersister<
  Schemas extends OptionalSchemas,
  TLoadedData extends Record<string, Table>,
>(
  store: MergeableStore<Schemas>,
  config: MultiTableDirConfig<Schemas, TLoadedData> & {
    lazyLoading?: undefined;
  },
): ReturnType<typeof createCollectorPersister<Schemas>>;

// Implementation
export function createMultiTableDirPersister<
  Schemas extends OptionalSchemas,
  TLoadedData extends Record<string, Table>,
>(
  store: MergeableStore<Schemas>,
  config: MultiTableDirConfig<Schemas, TLoadedData>,
):
  | MultiTableDirPersisterWithLazyLoading<Schemas>
  | ReturnType<typeof createCollectorPersister<Schemas>> {
  const {
    label,
    dirName,
    entityParser,
    tables,
    cleanup,
    loadAll,
    loadSingle,
    lazyLoading,
    save,
  } = config;

  // Internal state for lazy loading (only used if lazyLoading is configured)
  const contentLoadState: ContentLoadState | null = lazyLoading
    ? { loaded: new Set(), loading: new Set() }
    : null;

  const deletionMarker = createDeletionMarker<TLoadedData>(
    store as DeletionMarkerStore,
    tables,
  );
  const tableNames = tables.map((t) => t.tableName);

  const persister = createCollectorPersister(store, {
    label,
    watchPaths: [`${dirName}/`],
    cleanup,
    entityParser,
    loadSingle: async (entityId: string) => {
      try {
        const dataDir = await getDataDir();
        const loadResult = await loadSingle(dataDir, entityId);

        if (loadResult.status === "error") {
          console.error(
            `[${label}] loadSingle error for ${entityId}:`,
            loadResult.error,
          );
          return undefined;
        }

        const result = deletionMarker.markForEntity(loadResult.data, entityId);

        // Mark as loaded if using lazy loading
        if (contentLoadState) {
          contentLoadState.loaded.add(entityId);
          contentLoadState.loading.delete(entityId);
        }

        if (!hasChanges(result, tableNames)) {
          return undefined;
        }

        return toPersistedChanges<Schemas>(result);
      } catch (error) {
        console.error(`[${label}] loadSingle error for ${entityId}:`, error);
        return undefined;
      }
    },
    save,
    load: async () => {
      try {
        const dataDir = await getDataDir();

        // Use metadata-only loading if lazy loading is configured
        const loader = lazyLoading?.loadMetadata ?? loadAll;
        const loadResult = await loader(dataDir);

        if (loadResult.status === "error") {
          console.error(`[${label}] load error:`, loadResult.error);
          return undefined;
        }

        const result = deletionMarker.markAll(loadResult.data);

        // Clear load state on fresh load
        if (contentLoadState) {
          contentLoadState.loaded.clear();
          contentLoadState.loading.clear();
        }

        if (!hasChanges(result, tableNames)) {
          return undefined;
        }

        return toContent<Schemas>(result);
      } catch (error) {
        console.error(`[${label}] load error:`, error);
        return undefined;
      }
    },
  });

  // If lazy loading is not configured, return just the persister directly
  if (!lazyLoading || !contentLoadState) {
    return persister;
  }

  // Return persister with lazy loading utilities
  return {
    persister,
    loadEntityContent: async (entityId: string): Promise<boolean> => {
      // Already loaded or currently loading - skip
      if (
        contentLoadState.loaded.has(entityId) ||
        contentLoadState.loading.has(entityId)
      ) {
        return false;
      }

      contentLoadState.loading.add(entityId);

      try {
        const dataDir = await getDataDir();
        const contentResult = await lazyLoading.loadContent(dataDir, entityId);

        if (contentResult.status === "error") {
          console.error(
            `[${label}] loadEntityContent error for ${entityId}:`,
            contentResult.error,
          );
          contentLoadState.loading.delete(entityId);
          contentLoadState.loaded.add(entityId); // Mark as loaded to prevent retry loops
          return false;
        }

        const result = deletionMarker.markForEntity(
          contentResult.data,
          entityId,
        );
        contentLoadState.loading.delete(entityId);
        contentLoadState.loaded.add(entityId);

        if (hasChanges(result, tableNames)) {
          // Apply content to store by setting rows directly
          // We use type assertions here because the result comes from loadContent
          // which returns the same table structure as the persister config
          store.transaction(() => {
            for (const tableName of tableNames) {
              const tableData = result[tableName];
              if (tableData) {
                for (const [rowId, rowData] of Object.entries(tableData)) {
                  if (rowData) {
                    // biome-ignore lint/suspicious/noExplicitAny: Dynamic table/row access requires any
                    (store as any).setRow(tableName, rowId, rowData);
                  }
                }
              }
            }
          });
        }

        return true;
      } catch (error) {
        console.error(
          `[${label}] loadEntityContent error for ${entityId}:`,
          error,
        );
        contentLoadState.loading.delete(entityId);
        contentLoadState.loaded.add(entityId);
        return false;
      }
    },
    isEntityContentLoaded: (entityId: string) =>
      contentLoadState.loaded.has(entityId),
    isEntityContentLoading: (entityId: string) =>
      contentLoadState.loading.has(entityId),
    clearContentLoadState: () => {
      contentLoadState.loaded.clear();
      contentLoadState.loading.clear();
    },
  };
}
