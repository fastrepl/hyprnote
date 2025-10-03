import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createIndexes,
  createMergeableStore,
  createMetrics,
  createQueries,
  createRelationships,
  type MergeableStore,
  type TablesSchema,
  ValuesSchema,
} from "tinybase/with-schemas";
import { z } from "zod";

import {
  calendarSchema as baseCalendarSchema,
  configSchema as baseConfigSchema,
  eventSchema as baseEventSchema,
  humanSchema as baseHumanSchema,
  mappingEventParticipantSchema as baseMappingEventParticipantSchema,
  mappingTagSessionSchema as baseMappingTagSessionSchema,
  organizationSchema as baseOrganizationSchema,
  sessionSchema as baseSessionSchema,
  TABLE_HUMANS,
  TABLE_SESSIONS,
  tagSchema as baseTagSchema,
  templateSchema as baseTemplateSchema,
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

export const tagSchema = baseTagSchema.omit({ id: true }).extend({
  created_at: z.string(),
});

export const mappingTagSessionSchema = baseMappingTagSessionSchema.omit({ id: true }).extend({
  created_at: z.string(),
});

export const templateSectionSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const templateSchema = baseTemplateSchema.omit({ id: true }).extend({
  created_at: z.string(),
  sections: jsonObject(z.array(templateSectionSchema)),
});

export const configSchema = baseConfigSchema.omit({ id: true }).extend({
  created_at: z.string(),
  spoken_languages: jsonObject(z.array(z.string())),
  jargons: jsonObject(z.array(z.string())),
  notification_ignored_platforms: jsonObject(z.array(z.string()).optional()),
  save_recordings: z.preprocess(val => val ?? undefined, z.boolean().optional()),
  selected_template_id: z.preprocess(val => val ?? undefined, z.string().optional()),
  ai_api_base: z.preprocess(val => val ?? undefined, z.string().optional()),
  ai_api_key: z.preprocess(val => val ?? undefined, z.string().optional()),
  ai_specificity: z.preprocess(val => val ?? undefined, z.string().optional()),
});

export type Human = z.infer<typeof humanSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type MappingEventParticipant = z.infer<typeof mappingEventParticipantSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type MappingTagSession = z.infer<typeof mappingTagSessionSchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type Config = z.infer<typeof configSchema>;

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
    tags: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      name: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof tagSchema>,
    mapping_tag_session: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      tag_id: { type: "string" },
      session_id: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof mappingTagSessionSchema>,
    templates: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      sections: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof templateSchema>,
    configs: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      autostart: { type: "boolean" },
      display_language: { type: "string" },
      spoken_languages: { type: "string" },
      jargons: { type: "string" },
      telemetry_consent: { type: "boolean" },
      save_recordings: { type: "boolean" },
      selected_template_id: { type: "string" },
      summary_language: { type: "string" },
      notification_before: { type: "boolean" },
      notification_auto: { type: "boolean" },
      notification_ignored_platforms: { type: "string" },
      ai_api_base: { type: "string" },
      ai_api_key: { type: "string" },
      ai_specificity: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof configSchema>,
  } as const satisfies TablesSchema,
};

export const TABLES_TO_SYNC = Object.keys(SCHEMA.table)
  .filter((key) => !key.startsWith("_")) as (keyof Omit<typeof SCHEMA.table, "_electric" | "_changes">)[];

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useCreateRelationships,
  useCreateQueries,
  useProvideStore,
  useProvideIndexes,
  useProvideRelationships,
  useProvideMetrics,
  useCreateIndexes,
  useCreateMetrics,
  useProvidePersister,
  useProvideQueries,
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
        )
        .setRelationshipDefinition(
          "tagSessionToTag",
          "mapping_tag_session",
          "tags",
          "tag_id",
        )
        .setRelationshipDefinition(
          "tagSessionToSession",
          "mapping_tag_session",
          "sessions",
          "session_id",
        ),
    [],
  )!;

  const queries = useCreateQueries(store, (store) =>
    createQueries(store)
      .setQueryDefinition(QUERIES.configForUser, "configs", ({ select, where }) => {
        select("user_id");
        select("created_at");
        select("autostart");
        select("display_language");
        select("spoken_languages");
        select("jargons");
        select("telemetry_consent");
        select("save_recordings");
        select("selected_template_id");
        select("summary_language");
        select("notification_before");
        select("notification_auto");
        select("notification_ignored_platforms");
        select("ai_api_base");
        select("ai_api_key");
        select("ai_specificity");
        where((getCell) => getCell("user_id") === store.getValue("_user_id"));
      }), [])!;

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
      )
      .setIndexDefinition(INDEXES.tagsByName, "tags", "name")
      .setIndexDefinition(INDEXES.tagSessionsBySession, "mapping_tag_session", "session_id")
      .setIndexDefinition(INDEXES.tagSessionsByTag, "mapping_tag_session", "tag_id"));

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
  useProvideQueries(STORE_ID, queries!);
  useProvideIndexes(STORE_ID, indexes!);
  useProvideMetrics(STORE_ID, metrics!);
  useProvidePersister(LOCAL_PERSISTER_ID, localPersister);

  return null;
};

export const QUERIES = {
  configForUser: "configForUser",
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
  tagsByName: "tagsByName",
  tagSessionsBySession: "tagSessionsBySession",
  tagSessionsByTag: "tagSessionsByTag",
};
