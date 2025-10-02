import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createIndexes,
  createMergeableStore,
  createMetrics,
  createRelationships,
  type MergeableStore,
  type TablesSchema,
  ValuesSchema,
} from "tinybase/with-schemas";
import { z } from "zod";

import { TABLE_HUMANS, TABLE_SESSIONS } from "@hypr/db";
import { createLocalPersister, LOCAL_PERSISTER_ID } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";
import { InferTinyBaseSchema, jsonObject } from "../shared";

export const STORE_ID = "hybrid";

export const humanSchema = z.object({
  name: z.string(),
  email: z.string(),
  createdAt: z.iso.datetime(),
  orgId: z.string(),
});
export type Human = z.infer<typeof humanSchema>;

export const eventSchema = z.object({
  humanId: z.string(),
  title: z.string(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
});
export type Event = z.infer<typeof eventSchema>;

export const organizationSchema = z.object({
  name: z.string(),
  createdAt: z.iso.datetime(),
});
export type Organization = z.infer<typeof organizationSchema>;

const transcriptSchema = z.object({
  words: z.array(z.object({
    text: z.string(),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  })),
});

export const sessionSchema = z.object({
  eventId: z.string().optional(),
  humanId: z.string(),
  createdAt: z.iso.datetime(),
  title: z.string(),
  raw_md: z.string(),
  enhanced_md: z.string(),
  transcript: jsonObject(transcriptSchema),
});
export type Session = z.infer<typeof sessionSchema>;

// Any field prefixed with _ should stay local.
const SCHEMA = {
  value: {
    _user_id: { type: "string" },
    _device_id: { type: "string" },
  } as const satisfies ValuesSchema,
  table: {
    _electric: {
      offset: { type: "string" },
      handle: { type: "string" },
      table: { type: "string" },
    },
    sessions: {
      eventId: { type: "string" },
      humanId: { type: "string" },
      createdAt: { type: "string" },
      title: { type: "string" },
      raw_md: { type: "string" },
      enhanced_md: { type: "string" },
      transcript: { type: "string" },
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
  } as const satisfies TablesSchema,
};

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
  useProvidePersister,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value)
  );

  const localPersister = useCreatePersister(
    store,
    (store) => createLocalPersister<Schemas>(store as Store, { storeTableName: STORE_ID }),
    [],
    (persister) => persister.startAutoPersisting(),
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
  useProvidePersister(LOCAL_PERSISTER_ID, localPersister);

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
