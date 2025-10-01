import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createMergeableStore,
  createRelationships,
  type MergeableStore,
  type NoValuesSchema,
  type TablesSchema,
} from "tinybase/with-schemas";
import { z } from "zod";

import { TABLE_SESSIONS, TABLE_USERS } from "@hypr/db";
import { createCloudPersister } from "../cloudPersister";
import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";
import { InferTinyBaseSchema } from "../shared";

export const STORE_ID = "hybrid";

export const userSchema = z.object({
  name: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export const sessionSchema = z.object({
  userId: z.string(),
  createdAt: z.string(),
  title: z.string(),
  raw_md: z.string(),
  enhanced_md: z.string(),
});

const TABLE_SCHEMA = {
  sessions: {
    title: { type: "string" },
    userId: { type: "string" },
    createdAt: { type: "string" },
    raw_md: { type: "string" },
    enhanced_md: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof sessionSchema>,
  users: {
    name: { type: "string" },
    email: { type: "string" },
    createdAt: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof userSchema>,
} as const satisfies TablesSchema;

type Schemas = [typeof TABLE_SCHEMA, NoValuesSchema];

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useCreateRelationships,
  useProvideStore,
  useProvideRelationships,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;

const CLOUD_ENABLED = false;

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() => createMergeableStore().setTablesSchema(TABLE_SCHEMA));

  useCreatePersister(
    store,
    (store) => createLocalPersister<Schemas>(store as Store),
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

      return createCloudPersister(store as Store, {
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

  const relationships = useCreateRelationships(
    store,
    (store) =>
      createRelationships(store).setRelationshipDefinition(
        "sessionUser",
        TABLE_SESSIONS,
        TABLE_USERS,
        "userId",
      ),
    [],
  )!;

  useProvideStore(STORE_ID, store);
  useProvideRelationships(STORE_ID, relationships);

  return null;
};
