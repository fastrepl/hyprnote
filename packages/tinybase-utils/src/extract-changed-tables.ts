import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { OptionalSchemas } from "tinybase/with-schemas";

import type { ChangedTables } from "./types";

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
