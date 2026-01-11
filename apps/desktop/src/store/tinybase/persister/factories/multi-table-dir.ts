import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  createDeletionMarker,
  type DeletionMarkerStore,
  type TableConfigEntry,
} from "../shared/deletion-marker";
import { getDataDir } from "../shared/paths";
import type { ChangedTables, SaveResult, TablesContent } from "../shared/types";
import { asTablesChanges } from "../shared/utils";
import {
  createCollectorPersister,
  type OrphanCleanupConfig,
} from "./collector";

type Table = Record<string, Record<string, unknown>>;

export type MultiTableDirConfig<
  Schemas extends OptionalSchemas,
  TLoadedData extends Record<string, Table>,
> = {
  label: string;
  dirName: string;
  entityParser: (path: string) => string | null;
  tables: TableConfigEntry<Schemas, TLoadedData>[];
  cleanup: (tables: TablesContent) => OrphanCleanupConfig[];
  loadAll: (dataDir: string) => Promise<TLoadedData>;
  loadSingle: (dataDir: string, entityId: string) => Promise<TLoadedData>;
  save: (
    store: MergeableStore<Schemas>,
    tables: TablesContent,
    dataDir: string,
    changedTables?: ChangedTables,
  ) => SaveResult;
};

function hasChanges<TLoadedData extends Record<string, Table>>(
  result: { [K in keyof TLoadedData]: Record<string, unknown> },
  tableNames: (keyof TLoadedData)[],
): boolean {
  return tableNames.some((name) => Object.keys(result[name] ?? {}).length > 0);
}

export function createMultiTableDirPersister<
  Schemas extends OptionalSchemas,
  TLoadedData extends Record<string, Table>,
>(
  store: MergeableStore<Schemas>,
  config: MultiTableDirConfig<Schemas, TLoadedData>,
): ReturnType<typeof createCollectorPersister<Schemas>> {
  const {
    label,
    dirName,
    entityParser,
    tables,
    cleanup,
    loadAll,
    loadSingle,
    save,
  } = config;

  const deletionMarker = createDeletionMarker<TLoadedData>(
    store as DeletionMarkerStore,
    tables,
  );
  const tableNames = tables.map((t) => t.tableName);

  return createCollectorPersister(store, {
    label,
    watchPaths: [`${dirName}/`],
    cleanup,
    entityParser,
    loadSingle: async (entityId: string) => {
      try {
        const dataDir = await getDataDir();
        const data = await loadSingle(dataDir, entityId);
        const result = deletionMarker.markForEntity(data, entityId);

        if (!hasChanges(result, tableNames)) {
          return undefined;
        }

        return asTablesChanges(
          result as Record<
            string,
            Record<string, Record<string, unknown> | undefined> | undefined
          >,
        ) as unknown as PersistedChanges<
          Schemas,
          Persists.StoreOrMergeableStore
        >;
      } catch (error) {
        console.error(`[${label}] loadSingle error for ${entityId}:`, error);
        return undefined;
      }
    },
    save,
    load: async () => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAll(dataDir);
        const result = deletionMarker.markAll(data);

        if (!hasChanges(result, tableNames)) {
          return undefined;
        }

        return asTablesChanges(
          result as Record<
            string,
            Record<string, Record<string, unknown> | undefined> | undefined
          >,
        ) as unknown as Content<Schemas>;
      } catch (error) {
        console.error(`[${label}] load error:`, error);
        return undefined;
      }
    },
  });
}
