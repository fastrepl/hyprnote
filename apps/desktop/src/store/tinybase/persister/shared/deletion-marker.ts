import type { OptionalSchemas } from "tinybase/with-schemas";

type Row = Record<string, unknown>;
type Table = Record<string, Row>;

type TablesSchemaOf<S extends OptionalSchemas> = S extends [infer T, unknown]
  ? T
  : never;

export type TableNames<S extends OptionalSchemas> = keyof TablesSchemaOf<S> &
  string;

export type TableColumns<
  S extends OptionalSchemas,
  TName extends TableNames<S>,
> =
  TablesSchemaOf<S> extends infer T
    ? TName extends keyof T
      ? keyof T[TName] & string
      : never
    : never;

export type TableConfig<
  S extends OptionalSchemas,
  TData extends Record<string, Table>,
  TName extends TableNames<S> & (keyof TData & string) = TableNames<S> &
    (keyof TData & string),
> =
  | { tableName: TName; isPrimary: true }
  | { tableName: TName; foreignKey: TableColumns<S, TName> }
  | { tableName: TName };

export type TableConfigEntry<
  S extends OptionalSchemas,
  TData extends Record<string, Table>,
> = {
  [TName in TableNames<S> & (keyof TData & string)]:
    | { tableName: TName; isPrimary: true }
    | { tableName: TName; foreignKey: TableColumns<S, TName> }
    | { tableName: TName };
}[TableNames<S> & (keyof TData & string)];

export type RuntimeTableConfig =
  | { tableName: string; isPrimary: true }
  | { tableName: string; foreignKey: string }
  | { tableName: string };

export interface DeletionMarkerStore {
  getTable(tableName: string): Table | undefined;
  getRow(tableName: string, rowId: string): Row | undefined;
}

export type DeletionMarkerResult<TData extends Record<string, Table>> = {
  [K in keyof TData]: Record<string, Row | undefined>;
};

export function createDeletionMarker<
  TData extends Record<string, Table>,
  TConfig extends RuntimeTableConfig = RuntimeTableConfig,
>(
  store: DeletionMarkerStore,
  tableConfigs: TConfig[],
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
