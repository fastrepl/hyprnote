type Row = Record<string, unknown>;
type Table = Record<string, Row>;

export type TableConfig<TData extends Record<string, Table>> =
  | { tableName: keyof TData & string; isPrimary: true }
  | { tableName: keyof TData & string; foreignKey: string }
  | { tableName: keyof TData & string };

export interface DeletionMarkerStore {
  getTable(tableName: string): Table | undefined;
  getRow(tableName: string, rowId: string): Row | undefined;
}

export type DeletionMarkerResult<TData extends Record<string, Table>> = {
  [K in keyof TData]: Record<string, Row | undefined>;
};

export function createDeletionMarker<TData extends Record<string, Table>>(
  store: DeletionMarkerStore,
  tableConfigs: TableConfig<TData>[],
): {
  markAll: (loaded: TData) => DeletionMarkerResult<TData>;
  markForEntity: (
    loaded: TData,
    entityId: string,
  ) => DeletionMarkerResult<TData>;
} {
  const markTable = (
    tableName: string,
    loadedTable: Table,
    idsToCheck: Iterable<string>,
    shouldMark: (id: string, row: Row) => boolean,
  ): Record<string, Row | undefined> => {
    const tableResult: Record<string, Row | undefined> = { ...loadedTable };

    for (const id of idsToCheck) {
      if (!(id in loadedTable)) {
        const row = store.getRow(tableName, id);
        if (row && shouldMark(id, row)) {
          tableResult[id] = undefined;
        }
      }
    }

    return tableResult;
  };

  return {
    markAll: (loaded: TData): DeletionMarkerResult<TData> => {
      const result = {} as DeletionMarkerResult<TData>;

      for (const config of tableConfigs) {
        const tableName = config.tableName as keyof TData & string;
        const loadedTable = loaded[tableName] ?? {};
        const existingTable = store.getTable(tableName) ?? {};

        result[tableName] = markTable(
          tableName,
          loadedTable,
          Object.keys(existingTable),
          () => true,
        );
      }

      return result;
    },

    markForEntity: (
      loaded: TData,
      entityId: string,
    ): DeletionMarkerResult<TData> => {
      const result = {} as DeletionMarkerResult<TData>;

      for (const config of tableConfigs) {
        const tableName = config.tableName as keyof TData & string;
        const loadedTable = loaded[tableName] ?? {};

        if ("isPrimary" in config && config.isPrimary) {
          result[tableName] = markTable(
            tableName,
            loadedTable,
            [entityId],
            () => true,
          );
        } else if ("foreignKey" in config) {
          const existingTable = store.getTable(tableName) ?? {};
          const foreignKey = config.foreignKey;

          result[tableName] = markTable(
            tableName,
            loadedTable,
            Object.keys(existingTable),
            (_id, row) => row[foreignKey] === entityId,
          );
        } else {
          result[tableName] = { ...loadedTable };
        }
      }

      return result;
    },
  };
}
