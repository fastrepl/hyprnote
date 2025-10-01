import * as UI from "tinybase/ui-react/with-schemas";

import {
  createMergeableStore,
  createQueries,
  createRelationships,
  type MergeableStore,
  type NoValuesSchema,
} from "tinybase/with-schemas";

import { TABLE_NAME_MAPPING } from "@hypr/db";
import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";

export const STORE_ID = "main";

const SCHEMA = {
  sessions: {
    title: { type: "string" },
    userId: { type: "string" },
    createdAt: { type: "string" },
  },
  users: {
    name: { type: "string" },
    email: { type: "string" },
    createdAt: { type: "string" },
  },
} as const;

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
    (store) =>
      createRelationships(store).setRelationshipDefinition(
        "sessionUser",
        TABLE_NAME_MAPPING.sessions,
        TABLE_NAME_MAPPING.users,
        "userId",
      ),
    [],
  );

  useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(
        "recentSessions",
        TABLE_NAME_MAPPING.sessions,
        ({ select }) => {
          select("title");
          select("userId");
          select("createdAt");
        },
      ),
    [],
  );

  useProvideStore(STORE_ID, store);

  return null;
};
