import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createMergeableStore,
  createRelationships,
  type MergeableStore,
  type NoValuesSchema,
  type TablesSchema,
} from "tinybase/with-schemas";
import { z } from "zod";

import { TABLE_HUMANS, TABLE_ORGANIZATIONS, TABLE_SESSIONS } from "@hypr/db";
import { createCloudPersister } from "../cloudPersister";
import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";
import { InferTinyBaseSchema } from "../shared";

export const STORE_ID = "hybrid";

export const humanSchema = z.object({
  name: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export const organizationSchema = z.object({
  name: z.string(),
  createdAt: z.string(),
});

export const sessionSchema = z.object({
  humanId: z.string(),
  createdAt: z.string(),
  title: z.string(),
  raw_md: z.string(),
  enhanced_md: z.string(),
});

const TABLE_SCHEMA = {
  sessions: {
    title: { type: "string" },
    humanId: { type: "string" },
    createdAt: { type: "string" },
    raw_md: { type: "string" },
    enhanced_md: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof sessionSchema>,
  humans: {
    name: { type: "string" },
    email: { type: "string" },
    createdAt: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof humanSchema>,
  organizations: {
    name: { type: "string" },
    createdAt: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof organizationSchema>,
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
          humans: {
            tableId: TABLE_HUMANS,
            ...shared,
          },
          organizations: {
            tableId: TABLE_ORGANIZATIONS,
            ...shared,
          },
          sessions: {
            tableId: TABLE_SESSIONS,
            ...shared,
          },
        },
        save: {
          humans: {
            tableName: TABLE_HUMANS,
            ...shared,
          },
          organizations: {
            tableName: TABLE_ORGANIZATIONS,
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
        "sessionHuman",
        TABLE_SESSIONS,
        TABLE_HUMANS,
        "humanId",
      ),
    [],
  )!;

  useProvideStore(STORE_ID, store);
  useProvideRelationships(STORE_ID, relationships);

  return null;
};
