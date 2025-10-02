import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createMergeableStore,
  createQueries,
  createRelationships,
  type MergeableStore,
  type NoTablesSchema,
  type ValuesSchema,
} from "tinybase/with-schemas";

import { createLocalSynchronizer } from "../localSynchronizer";

export const STORE_ID = "memory";

const VALUES_SCHEMA = {
  state: { type: "string" },
  amplitude_mic: { type: "number" },
  amplitude_speaker: { type: "number" },
} as const satisfies ValuesSchema;

const {
  useCreateMergeableStore,
  useCreateSynchronizer,
  useCreateRelationships,
  useCreateQueries,
  useProvideStore,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [NoTablesSchema, typeof VALUES_SCHEMA];

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() => createMergeableStore().setValuesSchema(VALUES_SCHEMA));

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
