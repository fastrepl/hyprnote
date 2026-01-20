import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { Content, OptionalSchemas } from "tinybase/with-schemas";

import type { TablesChanges, TablesInput } from "./types";

/**
 * Wrap tables in TinyBase changes format.
 *
 * https://github.com/tinyplex/tinybase/blob/aa5cb9014f6def18266414174e0fd31ccfae0828/src/persisters/common/create.ts#L185
 *
 * When content[2] === 1, TinyBase uses applyChanges() instead of setContent(),
 * allowing us to merge into a specific table without wiping other tables.
 *
 * TinyBase deletion convention:
 * - Delete cell: { tableId: { rowId: { cellId: undefined } } }
 * - Delete row: { tableId: { rowId: undefined } }
 * - Delete table: { tableId: undefined }
 */
export function asTablesChanges(tables: TablesInput): TablesChanges {
  return [tables, {}, 1];
}

/**
 * Convert tables to PersistedChanges type for use with TinyBase persisters.
 */
export function toPersistedChanges<Schemas extends OptionalSchemas>(
  tables: TablesInput,
): PersistedChanges<Schemas, Persists.StoreOrMergeableStore> {
  return asTablesChanges(tables) as PersistedChanges<
    Schemas,
    Persists.StoreOrMergeableStore
  >;
}

/**
 * Convert tables to Content type for use with TinyBase.
 *
 * We intentionally return 3-element tuple ([tables, {}, 1]) to use applyChanges
 * semantics, but Content type expects 2 elements - type cast is required.
 */
export function toContent<Schemas extends OptionalSchemas>(
  tables: TablesInput,
): Content<Schemas> {
  return asTablesChanges(tables) as unknown as Content<Schemas>;
}
