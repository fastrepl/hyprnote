import * as UI from "tinybase/ui-react/with-schemas";

import {
  createMergeableStore,
  type MergeableStore,
  type NoValuesSchema,
  type TablesSchema,
} from "tinybase/with-schemas";

import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";

export const STORE_ID = "internal";

const SCHEMA = {
  electric_client: {
    offset: { type: "string" },
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
} = UI as UI.WithSchemas<Schemas>;

export const TypedUI = UI as UI.WithSchemas<Schemas>;

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
