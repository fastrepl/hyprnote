import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { OptionalSchemas } from "tinybase/with-schemas";

import type {
  JsonValue as FsSyncJsonValue,
  ParsedDocument,
} from "@hypr/plugin-fs-sync";
import { SCHEMA } from "@hypr/store";

import type { Store } from "../../store/main";

export type { FsSyncJsonValue as JsonValue };

export type BatchItem<T> = [T, string];

export type TablesContent = Partial<ReturnType<Store["getTables"]>>;

type TableRowType<K extends keyof TablesContent> =
  NonNullable<TablesContent[K]> extends Record<string, infer R> ? R : never;

export type WriteOperation =
  | { type: "json"; path: string; content: unknown }
  | { type: "document-batch"; items: Array<[ParsedDocument, string]> }
  | { type: "delete"; path: string }
  | { type: "delete-batch"; paths: string[] };

export type CollectorResult = {
  operations: WriteOperation[];
};

type TableNames = keyof typeof SCHEMA.table;

export type ChangedTables = Partial<{
  [K in TableNames]: Record<string, unknown> | undefined;
}>;

/**
 * Extract changed tables from TinyBase's Changes or MergeableChanges.
 *
 * TinyBase Data Formats (from create.ts):
 * https://github.com/tinyplex/tinybase/blob/main/src/persisters/common/create.ts
 *
 * | Type              | Format                                           | Example                                          |
 * |-------------------|--------------------------------------------------|--------------------------------------------------|
 * | Content           | [tables, values]                                 | [{users: {...}}, {}]                             |
 * | Changes           | [changedTables, changedValues, 1]                | [{users: {row1: {...}}}, {}, 1]                  |
 * | MergeableContent  | [[tables, hlc?], [values, hlc?]]                 | [[{users: {...}}, "hlc123"], [{}, "hlc456"]]     |
 * | MergeableChanges  | [[changedTables, hlc?], [changedValues, hlc?], 1]| [[{users: {...}}, "hlc"], [{}, "hlc"], 1]        |
 *
 * The [2] === 1 flag distinguishes changes from content:
 * - When present, TinyBase uses applyChanges() / applyMergeableChanges()
 * - When absent, TinyBase uses setContent() / setMergeableContent()
 *
 * TinyBase's hasChanges destructuring patterns:
 * - Regular Changes:   ([changedTables, changedValues]: Changes) => ...
 * - MergeableChanges:  ([[changedTables], [changedValues]]: MergeableChanges) => ...
 *
 * Note the double brackets for MergeableChanges - each element is [data, hlc?].
 */
export function extractChangedTables<Schemas extends OptionalSchemas>(
  changes:
    | PersistedChanges<Schemas, Persists.StoreOrMergeableStore>
    | undefined,
): ChangedTables | null {
  if (!changes || !Array.isArray(changes) || changes.length < 1) {
    return null;
  }

  const tablesOrStamp = changes[0];

  // MergeableChanges: [[changedTables, hlc?], [changedValues, hlc?], 1]
  if (Array.isArray(tablesOrStamp) && tablesOrStamp.length >= 1) {
    const tables = tablesOrStamp[0];
    if (tables && typeof tables === "object") {
      return unwrapMergeableTables(tables as Record<string, unknown>);
    }
    return null;
  }

  // Regular Changes: [changedTables, changedValues, 1]
  if (tablesOrStamp && typeof tablesOrStamp === "object") {
    return tablesOrStamp as ChangedTables;
  }

  return null;
}

// Unwrap MergeableChanges table structure where each value is [thing, hlc?]
function unwrapMergeableTables(tables: Record<string, unknown>): ChangedTables {
  const result: ChangedTables = {};

  for (const [tableName, tableValue] of Object.entries(tables)) {
    const key = tableName as TableNames;
    if (!tableValue) {
      result[key] = undefined;
      continue;
    }

    // MergeableChanges wraps each table in [rows, hlc?]
    if (Array.isArray(tableValue) && tableValue.length >= 1) {
      const rows = tableValue[0];
      if (rows && typeof rows === "object") {
        result[key] = unwrapMergeableRows(rows as Record<string, unknown>);
      }
    } else if (typeof tableValue === "object") {
      // Fallback: treat as regular rows
      result[key] = tableValue as Record<string, unknown>;
    }
  }

  return result;
}

// Unwrap MergeableChanges row structure where each row is [cells, hlc?]
function unwrapMergeableRows(
  rows: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [rowId, rowValue] of Object.entries(rows)) {
    if (!rowValue) {
      result[rowId] = undefined;
      continue;
    }

    // MergeableChanges wraps each row in [cells, hlc?]
    if (Array.isArray(rowValue) && rowValue.length >= 1) {
      result[rowId] = rowValue[0];
    } else {
      result[rowId] = rowValue;
    }
  }

  return result;
}

export interface MarkdownDirPersisterConfig<TStorage> {
  tableName: string;
  dirName: string;
  label: string;
  toFrontmatter: (entity: TStorage) => {
    frontmatter: Record<string, FsSyncJsonValue>;
    body: string;
  };
  fromFrontmatter: (
    frontmatter: Record<string, unknown>,
    body: string,
  ) => TStorage;
}

// https://github.com/tinyplex/tinybase/blob/aa5cb9014f6def18266414174e0fd31ccfae0828/src/persisters/common/create.ts#L185
// When content[2] === 1, TinyBase uses applyChanges() instead of setContent(),
// allowing us to merge into a specific table without wiping other tables.
//
// TinyBase deletion convention:
// - Delete cell: { tableId: { rowId: { cellId: undefined } } }
// - Delete row: { tableId: { rowId: undefined } }
// - Delete table: { tableId: undefined }
export function asTablesChanges(
  tables: Record<
    string,
    Record<string, Record<string, unknown> | undefined> | undefined
  >,
): [Record<string, unknown>, Record<string, unknown>, 1] {
  return [tables, {}, 1];
}

export function iterateTableRows<K extends keyof TablesContent>(
  tables: TablesContent | undefined,
  tableName: K,
): Array<TableRowType<K> & { id: string }> {
  const result: Array<TableRowType<K> & { id: string }> = [];
  const tableData = tables?.[tableName];
  if (tableData) {
    for (const [id, row] of Object.entries(tableData)) {
      result.push({ ...row, id } as TableRowType<K> & { id: string });
    }
  }
  return result;
}

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
