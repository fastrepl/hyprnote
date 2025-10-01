import * as _UI from "tinybase/ui-react/with-schemas";

import {
  createMergeableStore,
  type MergeableStore,
  type NoValuesSchema,
  type TablesSchema,
} from "tinybase/with-schemas";

import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";

export const STORE_ID = "local";

const SCHEMA = {
  electric_meta: {
    offset: { type: "number" },
    handle: { type: "string" },
    table: { type: "string" },
  },
} as const satisfies TablesSchema;

type Schemas = [typeof SCHEMA, NoValuesSchema];

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useProvideStore,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() => createMergeableStore().setTablesSchema(SCHEMA));

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
