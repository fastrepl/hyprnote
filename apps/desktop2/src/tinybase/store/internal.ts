import * as _UI from "tinybase/ui-react/with-schemas";
import { createMergeableStore, type MergeableStore, type TablesSchema, ValuesSchema } from "tinybase/with-schemas";

export const STORE_ID = "internal";

export const SCHEMA = {
  value: {
    user_id: { type: "string" },
    device_id: { type: "string" },
  } as const satisfies ValuesSchema,
  table: {
    changes: {
      row_id: { type: "string" },
      table: { type: "string" },
      updated: { type: "boolean" },
      deleted: { type: "boolean" },
    },
    electric: {
      offset: { type: "string" },
      handle: { type: "string" },
      table: { type: "string" },
    },
  } as const satisfies TablesSchema,
};

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

export const useStore = () => {
  const store = UI.useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value)
  );

  UI.useProvideStore(STORE_ID, store);

  return store;
};
