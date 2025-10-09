import * as _UI from "tinybase/ui-react/with-schemas";
import { createMergeableStore, type MergeableStore, type TablesSchema, ValuesSchema } from "tinybase/with-schemas";

import { createLocalPersister } from "./localPersister";
import { createLocalSynchronizer } from "./localSynchronizer";

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

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useProvideStore,
  useProvidePersister,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

export const createStore = () => {
  const store = createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);

  return store;
};

export const useStore = () => {
  const store = useCreateMergeableStore(() => createStore());
  // TODO
  store.setValue("user_id", "4c2c0e44-f674-4c67-87d0-00bcfb78dc8a");

  useCreateSynchronizer(
    store,
    async (store) => createLocalSynchronizer(store),
    [],
    (sync) => sync.startSync(),
  );

  const localPersister = useCreatePersister(
    store,
    (store) =>
      createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
        autoLoadIntervalSeconds: 9999,
      }),
    [],
    (persister) => persister.startAutoPersisting(),
  );

  useProvideStore(STORE_ID, store);
  useProvidePersister(STORE_ID, localPersister);

  return store;
};

export const rowIdOfChange = (table: string, row: string) => `${table}:${row}`;
