import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { Content, OptionalSchemas } from "tinybase/with-schemas";

import type { ChangedTables, TablesContent } from "./types";

type TablesInput = Record<
  string,
  Record<string, Record<string, unknown> | undefined> | undefined
>;

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
 *
 * IMPORTANT: In real MergeableChanges from getTransactionMergeableChanges(),
 * each table value is also stamped: { tableId: [rowsObject, hlc?, hash?] }
 * This function unwraps both the outer format AND the table-level stamps to
 * produce a simple { tableId: { rowId: ... } } format.
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
    const stampedTables = tablesOrStamp[0];
    if (stampedTables && typeof stampedTables === "object") {
      return unwrapStampedTables(stampedTables);
    }
    return null;
  }

  // Regular Changes: [changedTables, changedValues, 1]
  // Exclude arrays - they would be MergeableChanges format handled above.
  if (
    tablesOrStamp &&
    typeof tablesOrStamp === "object" &&
    !Array.isArray(tablesOrStamp)
  ) {
    return tablesOrStamp as ChangedTables;
  }

  return null;
}

function unwrapStampedTables(
  stampedTables: Record<string, unknown>,
): ChangedTables {
  const result: Record<string, Record<string, unknown> | undefined> = {};

  for (const [tableId, tableValue] of Object.entries(stampedTables)) {
    if (Array.isArray(tableValue) && tableValue.length >= 1) {
      const rowsObject = tableValue[0];
      if (rowsObject && typeof rowsObject === "object") {
        result[tableId] = rowsObject as Record<string, unknown>;
      }
    } else if (tableValue && typeof tableValue === "object") {
      result[tableId] = tableValue as Record<string, unknown>;
    } else {
      result[tableId] = tableValue as undefined;
    }
  }

  return result as ChangedTables;
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
  tables: TablesInput,
): [Record<string, unknown>, Record<string, unknown>, 1] {
  return [tables, {}, 1];
}

export function toPersistedChanges<Schemas extends OptionalSchemas>(
  tables: TablesInput,
): PersistedChanges<Schemas, Persists.StoreOrMergeableStore> {
  return asTablesChanges(tables) as PersistedChanges<
    Schemas,
    Persists.StoreOrMergeableStore
  >;
}

export function toContent<Schemas extends OptionalSchemas>(
  tables: TablesInput,
): Content<Schemas> {
  // We intentionally return 3-element tuple ([tables, {}, 1]) to use applyChanges
  // semantics, but Content type expects 2 elements - type cast is required.
  return asTablesChanges(tables) as unknown as Content<Schemas>;
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
