import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createMergeableStore,
  createQueries,
  createRelationships,
  type MergeableStore,
  type NoValuesSchema,
  type TablesSchema,
} from "tinybase/with-schemas";

import { TABLE_SESSIONS, TABLE_USERS } from "@hypr/db";
import { createCloudPersister } from "../cloudPersister";
import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";

export const STORE_ID = "hybrid";

const TABLE_SCHEMA = {
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
} as const satisfies TablesSchema;

type Schemas = [typeof TABLE_SCHEMA, NoValuesSchema];

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
  const store = useCreateMergeableStore(() => createMergeableStore().setTablesSchema(TABLE_SCHEMA));

  useCreatePersister(
    store,
    (store) => createLocalPersister<Schemas>(store as MergeableStore<Schemas>),
    [],
    (persister) => persister.startAutoPersisting(),
  );

  useCreatePersister(
    store,
    (store) => {
      const shared = {
        rowIdColumnName: "id",
        // condition: "$tableName.user_id = TODO" as const,
      };

      return createCloudPersister(store as MergeableStore<Schemas>, {
        load: {
          users: {
            tableId: TABLE_USERS,
            ...shared,
          },
          sessions: {
            tableId: TABLE_SESSIONS,
            ...shared,
          },
        },
        save: {
          users: {
            tableName: TABLE_USERS,
            ...shared,
          },
          sessions: {
            tableName: TABLE_SESSIONS,
            ...shared,
          },
        },
      });
    },
    [CLOUD_ENABLED],
    async (_persister) => {
      // We intentionally do not call `startAutoPersisting` here. It should be managed manually with cloud synchronizer.
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
