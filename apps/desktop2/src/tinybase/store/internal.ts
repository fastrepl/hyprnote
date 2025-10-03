import * as _UI from "tinybase/ui-react/with-schemas";
import { type MergeableStore, type TablesSchema, ValuesSchema } from "tinybase/with-schemas";

export const STORE_ID = "internal";

export const SCHEMA = {
  value: {} as const satisfies ValuesSchema,
  table: {
    _changes: {
      row_id: { type: "string" },
      table: { type: "string" },
      updated: { type: "boolean" },
      deleted: { type: "boolean" },
    },
  } as const satisfies TablesSchema,
};

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];
