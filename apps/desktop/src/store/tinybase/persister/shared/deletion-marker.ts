import type { Store } from "../../store/main";

type TableConfig<TData> =
  | { tableName: keyof TData & string; isPrimary: true }
  | { tableName: keyof TData & string; foreignKey: string }
  | { tableName: keyof TData & string };

type DeletionMarkerResult<
  TData extends Record<string, Record<string, unknown>>,
> = {
  [K in keyof TData]: Record<string, TData[K][string] | undefined>;
};

export function createDeletionMarker<
  TData extends Record<string, Record<string, unknown>>,
>(
  store: Store,
  tableConfigs: TableConfig<TData>[],
): {
  markAll: (loaded: TData) => DeletionMarkerResult<TData>;
  markForEntity: (
    loaded: TData,
    entityId: string,
  ) => DeletionMarkerResult<TData>;
} {
  return {
    markAll: (loaded: TData): DeletionMarkerResult<TData> => {
      const result = {} as DeletionMarkerResult<TData>;

      for (const config of tableConfigs) {
        const { tableName } = config;
        const loadedTable = loaded[tableName] ?? {};
        const existingTable = store.getTable(tableName as any) ?? {};

        const tableResult: Record<string, unknown> = { ...loadedTable };

        for (const id of Object.keys(existingTable)) {
          if (!(id in loadedTable)) {
            tableResult[id] = undefined;
          }
        }

        result[tableName as keyof TData] = tableResult as any;
      }

      return result;
    },

    markForEntity: (
      loaded: TData,
      entityId: string,
    ): DeletionMarkerResult<TData> => {
      const result = {} as DeletionMarkerResult<TData>;

      for (const config of tableConfigs) {
        const { tableName } = config;
        const loadedTable = loaded[tableName] ?? {};
        const tableResult: Record<string, unknown> = { ...loadedTable };

        if ("isPrimary" in config && config.isPrimary) {
          const existingRow = store.getRow(tableName as any, entityId);
          if (
            existingRow &&
            Object.keys(existingRow).length > 0 &&
            !(entityId in loadedTable)
          ) {
            tableResult[entityId] = undefined;
          }
        } else if ("foreignKey" in config) {
          const existingTable = store.getTable(tableName as any) ?? {};
          for (const [id, row] of Object.entries(existingTable)) {
            const rowForeignKey = (row as Record<string, unknown>)[
              config.foreignKey
            ];
            if (rowForeignKey === entityId && !(id in loadedTable)) {
              tableResult[id] = undefined;
            }
          }
        }

        result[tableName as keyof TData] = tableResult as any;
      }

      return result;
    },
  };
}
