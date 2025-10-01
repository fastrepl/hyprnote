import * as _UI from "tinybase/ui-react/with-schemas";

import { createMergeableStore, type MergeableStore, type TablesSchema, type ValuesSchema } from "tinybase/with-schemas";

import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";

export const STORE_ID = "local";

const TABLE_SCHEMA = {
  electric_meta: {
    offset: { type: "number" },
    handle: { type: "string" },
    table: { type: "string" },
  },
} as const satisfies TablesSchema;

const VALUES_SCHEMA = {
  user_id: { type: "string" },
  device_id: { type: "string" },
} as const satisfies ValuesSchema;

type Schemas = [typeof TABLE_SCHEMA, typeof VALUES_SCHEMA];

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useProvideStore,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(TABLE_SCHEMA)
      .setValuesSchema(VALUES_SCHEMA)
  );

  useCreatePersister(
    store,
    (store) => createLocalPersister<Schemas>(store as MergeableStore<Schemas>),
    [],
    (persister) => persister.startAutoPersisting(),
  );

  useCreateSynchronizer(
    store,
    async (store) => createLocalSynchronizer(store),
    [],
    (sync) => sync.startSync(),
  );

  useProvideStore(STORE_ID, store);

  return null;
};
