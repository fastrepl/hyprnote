import * as UI from "tinybase/ui-react/with-schemas";

import { createMergeableStore, createQueries, createRelationships, type NoValuesSchema } from "tinybase/with-schemas";

import { createLocalSynchronizer } from "../localSynchronizer";

export const STORE_ID = "memory";

const SCHEMA = {} as const;

type Schemas = [typeof SCHEMA, NoValuesSchema];

const {
  useCreateMergeableStore,
  useCreateSynchronizer,
  useCreateRelationships,
  useCreateQueries,
  useProvideStore,
} = UI as UI.WithSchemas<Schemas>;

export const TypedUI = UI as UI.WithSchemas<Schemas>;

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() => createMergeableStore().setTablesSchema(SCHEMA));

  useCreateSynchronizer(
    store,
    async (store) => createLocalSynchronizer(store),
    [],
    (sync) => sync.startSync(),
  );

  useCreateRelationships(
    store,
    (store) => createRelationships(store),
    [],
  );

  useCreateQueries(
    store,
    (store) => createQueries(store),
    [],
  );

  useProvideStore(STORE_ID, store);

  return null;
};
