import * as UI from "tinybase/ui-react/with-schemas";

import {
  createMergeableStore,
  createQueries,
  createRelationships,
  type MergeableStore,
  type NoValuesSchema,
} from "tinybase/with-schemas";

import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";

export const STORE_ID = "temp";

const SCHEMA = {} as const;

type Schemas = [typeof SCHEMA, NoValuesSchema];

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useCreateRelationships,
  useCreateQueries,
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
