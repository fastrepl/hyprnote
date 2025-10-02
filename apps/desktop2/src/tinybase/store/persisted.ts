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

import {
  calendarSchema as baseCalendarSchema,
  eventSchema as baseEventSchema,
  humanSchema as baseHumanSchema,
  mappingEventParticipantSchema as baseMappingEventParticipantSchema,
  organizationSchema as baseOrganizationSchema,
  sessionSchema as baseSessionSchema,
  TABLE_HUMANS,
  TABLE_SESSIONS,
  transcriptSchema,
} from "@hypr/db";
import { createLocalPersister, LOCAL_PERSISTER_ID } from "../localPersister";
import { createLocalSynchronizer } from "../localSynchronizer";
import { InferTinyBaseSchema, jsonObject } from "../shared";

export const STORE_ID = "persisted";

export const humanSchema = baseHumanSchema.omit({ id: true }).extend({ created_at: z.string() });

export const eventSchema = baseEventSchema.omit({ id: true }).extend({
  created_at: z.string(),
  started_at: z.string(),
  ended_at: z.string(),
});

export const calendarSchema = baseCalendarSchema.omit({ id: true }).extend({ created_at: z.string() });

export const organizationSchema = baseOrganizationSchema.omit({ id: true }).extend({ created_at: z.string() });

export const sessionSchema = baseSessionSchema.omit({ id: true }).extend({
  transcript: jsonObject(transcriptSchema),
  created_at: z.string(),
});

export const mappingEventParticipantSchema = baseMappingEventParticipantSchema.omit({ id: true }).extend({
  created_at: z.string(),
});

export type Human = z.infer<typeof humanSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type MappingEventParticipant = z.infer<typeof mappingEventParticipantSchema>;

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
    _changes: {
      row_id: { type: "string" },
      table: { type: "string" },
      operation: { type: "string" }, // "insert" | "update"
    },
    sessions: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      event_id: { type: "string" },
      title: { type: "string" },
      raw_md: { type: "string" },
      enhanced_md: { type: "string" },
      transcript: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof sessionSchema>,
    humans: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      org_id: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof humanSchema>,
    organizations: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      name: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof organizationSchema>,
    calendars: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      name: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof calendarSchema>,
    events: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      calendar_id: { type: "string" },
      title: { type: "string" },
      started_at: { type: "string" },
      ended_at: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof eventSchema>,
    mapping_event_participant: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      event_id: { type: "string" },
      human_id: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof mappingEventParticipantSchema>,
  } as const satisfies TablesSchema,
};

export const TABLES_TO_SYNC = Object.keys(SCHEMA.table)
  .filter((key) => !key.startsWith("_")) as (keyof Omit<typeof SCHEMA.table, "_electric" | "_changes">)[];

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
    (store) => createLocalPersister<Schemas>(store as Store, { storeTableName: STORE_ID, storeIdColumnName: "id" }),
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
      createRelationships(store)
        .setRelationshipDefinition(
          "sessionHuman",
          TABLE_SESSIONS,
          TABLE_HUMANS,
          "user_id",
        )
        .setRelationshipDefinition(
          "eventParticipantToHuman",
          "mapping_event_participant",
          "humans",
          "human_id",
        )
        .setRelationshipDefinition(
          "eventParticipantToEvent",
          "mapping_event_participant",
          "events",
          "event_id",
        )
        .setRelationshipDefinition(
          "eventToCalendar",
          "events",
          "calendars",
          "calendar_id",
        ),
    [],
  )!;

  const indexes = useCreateIndexes(store, (store) =>
    createIndexes(store)
      .setIndexDefinition(INDEXES.humansByOrg, "humans", "org_id", "name")
      .setIndexDefinition(INDEXES.eventsByCalendar, "events", "calendar_id", "started_at")
      .setIndexDefinition(
        INDEXES.eventsByDate,
        "events",
        (getCell) => {
          const d = new Date(getCell("started_at")!);
          return d.toISOString().slice(0, 10);
        },
        "started_at",
        (a, b) => a.localeCompare(b),
        (a, b) => String(a).localeCompare(String(b)),
      ).setIndexDefinition(
        INDEXES.eventsByMonth,
        "events",
        (getCell) => {
          const d = new Date(getCell("started_at")!);
          return d.toISOString().slice(0, 7);
        },
        "started_at",
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
  eventsByCalendar: "eventsByCalendar",
  eventsByDate: "eventsByDate",
  eventsByMonth: "eventsByMonth",
};
