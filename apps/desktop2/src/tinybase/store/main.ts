import * as _UI from "tinybase/ui-react/with-schemas";

import {
  createMergeableStore,
  createQueries,
  createRelationships,
  type MergeableStore,
  type NoValuesSchema,
} from "tinybase/with-schemas";

import { TABLE_SESSIONS, TABLE_USERS } from "@hypr/db";
import { createCloudPersister } from "../cloudPersister";
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
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;

const CLOUD_ENABLED = false;

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() => createMergeableStore().setTablesSchema(SCHEMA));

  useCreatePersister(
    store,
    (store) => createLocalPersister<Schemas>(store as MergeableStore<Schemas>),
    [],
    (persister) => persister.startAutoPersisting(),
  );

  useCreatePersister(
    store,
    (store) =>
      createCloudPersister(store as MergeableStore<Schemas>, {
        load: {
          users: TABLE_USERS,
          sessions: TABLE_SESSIONS,
        },
        save: {
          users: TABLE_USERS,
          sessions: TABLE_SESSIONS,
        },
      }),
    [CLOUD_ENABLED],
    async (persister) => {
      if (CLOUD_ENABLED) {
        await persister.startAutoPersisting();
      }
    },
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
        TABLE_SESSIONS,
        TABLE_USERS,
        "userId",
      ),
    [],
  );

  useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(
        "recentSessions",
        TABLE_SESSIONS,
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
