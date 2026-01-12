import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { OptionalSchemas } from "tinybase/with-schemas";

import { SCHEMA } from "@hypr/store";

import type { ChangedTables, TablesContent } from "./types";

type TableNames = keyof typeof SCHEMA.table;

type TableRowType<K extends keyof TablesContent> =
  NonNullable<TablesContent[K]> extends Record<string, infer R> ? R : never;

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

/**
 * Unwrap a TinyBase stamp tuple [value, hlc?, hash?] to extract the value.
 * If the input is not a stamp array, returns it as-is (fallback for non-mergeable data).
 */
function unwrapStamp<T>(value: T | [T, ...unknown[]]): T {
  return Array.isArray(value) && value.length >= 1 ? value[0] : (value as T);
}

/**
 * Transform each entry in a record using a mapping function.
 */
function mapRecord<V, R>(
  record: Record<string, V>,
  transform: (key: string, value: V) => R,
): Record<string, R> {
  const result: Record<string, R> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = transform(key, value);
  }
  return result;
}

/**
 * Unwrap MergeableChanges tables: {tableId: TableStamp} -> {tableId: rows}
 * TableStamp = [rows, hlc?, hash?]
 */
function unwrapMergeableTables(tables: Record<string, unknown>): ChangedTables {
  return mapRecord(tables, (_tableId, tableStamp) => {
    if (!tableStamp) return undefined;

    const rows = unwrapStamp(tableStamp);
    if (rows && typeof rows === "object") {
      return unwrapMergeableRows(rows as Record<string, unknown>);
    }
    return rows as Record<string, unknown> | undefined;
  });
}

/**
 * Unwrap MergeableChanges rows: {rowId: RowStamp} -> {rowId: cells}
 * RowStamp = [cells, hlc?, hash?]
 */
function unwrapMergeableRows(
  rows: Record<string, unknown>,
): Record<string, unknown> {
  return mapRecord(rows, (_rowId, rowStamp) => {
    if (!rowStamp) return undefined;

    const cells = unwrapStamp(rowStamp);
    if (cells && typeof cells === "object") {
      return unwrapMergeableCells(cells as Record<string, unknown>);
    }
    return cells;
  });
}

/**
 * Unwrap MergeableChanges cells: {cellId: CellStamp} -> {cellId: value}
 * CellStamp = [value, hlc?, hash?]
 */
function unwrapMergeableCells(
  cells: Record<string, unknown>,
): Record<string, unknown> {
  return mapRecord(cells, (_cellId, cellStamp) => {
    if (cellStamp === undefined) return undefined;
    return unwrapStamp(cellStamp);
  });
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
