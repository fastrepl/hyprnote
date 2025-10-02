import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createIndexes,
  createMergeableStore,
  createMetrics,
  createRelationships,
  type MergeableStore,
  type NoValuesSchema,
  type TablesSchema,
} from "tinybase/with-schemas";
import { z } from "zod";

import { TABLE_EVENTS, TABLE_HUMANS, TABLE_ORGANIZATIONS, TABLE_SESSIONS } from "@hypr/db";
import { createCloudPersister } from "../cloudPersister";
import { createLocalPersister } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";
import { InferTinyBaseSchema } from "../shared";

export const STORE_ID = "hybrid";

export const humanSchema = z.object({
  name: z.string(),
  email: z.string(),
  createdAt: z.string(),
  orgId: z.string(),
});
export type Human = z.infer<typeof humanSchema>;

export const eventSchema = z.object({
  humanId: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
});
export type Event = z.infer<typeof eventSchema>;

export const organizationSchema = z.object({
  name: z.string(),
  createdAt: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const sessionSchema = z.object({
  humanId: z.string(),
  createdAt: z.string(),
  title: z.string(),
  raw_md: z.string(),
  enhanced_md: z.string(),
});
export type Session = z.infer<typeof sessionSchema>;

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
    orgId: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof humanSchema>,
  organizations: {
    name: { type: "string" },
    createdAt: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof organizationSchema>,
  events: {
    humanId: { type: "string" },
    title: { type: "string" },
    startsAt: { type: "string" },
    endsAt: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof eventSchema>,
} as const satisfies TablesSchema;

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useCreateRelationships,
  useProvideStore,
  useProvideIndexes,
  useProvideRelationships,
  useProvideMetrics,
  useCreateIndexes,
  useCreateMetrics,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof TABLE_SCHEMA, NoValuesSchema];

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
          events: {
            tableId: TABLE_EVENTS,
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
          events: {
            tableName: TABLE_EVENTS,
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

  const indexes = useCreateIndexes(store, (store) =>
    createIndexes(store)
      .setIndexDefinition(INDEXES.humansByOrg, "humans", "orgId", "name")
      .setIndexDefinition(
        INDEXES.eventsByDate,
        "events",
        (getCell) => {
          const d = new Date(getCell("startsAt")!);
          return d.toISOString().slice(0, 10);
        },
        "startsAt",
        (a, b) => a.localeCompare(b),
        (a, b) => String(a).localeCompare(String(b)),
      ).setIndexDefinition(
        INDEXES.eventsByMonth,
        "events",
        (getCell) => {
          const d = new Date(getCell("startsAt")!);
          return d.toISOString().slice(0, 7);
        },
        "startsAt",
        (a, b) => a.localeCompare(b),
        (a, b) => String(a).localeCompare(String(b)),
      ));

  const metrics = useCreateMetrics(store, (store) =>
    createMetrics(store).setMetricDefinition(
      METRICS.totalHumans,
      "humans",
      "sum",
      () => 1,
    ).setMetricDefinition(
      METRICS.totalOrganizations,
      "organizations",
      "sum",
      () => 1,
    ));

  useProvideStore(STORE_ID, store);
  useProvideRelationships(STORE_ID, relationships);
  useProvideIndexes(STORE_ID, indexes!);
  useProvideMetrics(STORE_ID, metrics!);

  return null;
};

export const METRICS = {
  totalHumans: "totalHumans",
  totalOrganizations: "totalOrganizations",
};

export const INDEXES = {
  humansByOrg: "humansByOrg",
  eventsByDate: "eventsByDate",
  eventsByMonth: "eventsByMonth",
};
