import { format } from "date-fns";
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
  chatGroupSchema as baseChatGroupSchema,
  chatMessageSchema as baseChatMessageSchema,
  configSchema as baseConfigSchema,
  eventSchema as baseEventSchema,
  folderSchema as baseFolderSchema,
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
import { id } from "../../utils";
import * as internal from "./internal";
import { createLocalPersister, LOCAL_PERSISTER_ID } from "./localPersister";
import { createLocalSynchronizer } from "./localSynchronizer";
import { type InferTinyBaseSchema, jsonObject, type ToStorageType } from "./shared";

export const STORE_ID = "persisted";

export const humanSchema = baseHumanSchema.omit({ id: true }).extend({ created_at: z.string() });

export const eventSchema = baseEventSchema.omit({ id: true }).extend({
  created_at: z.string(),
  started_at: z.string(),
  ended_at: z.string(),
});

export const calendarSchema = baseCalendarSchema.omit({ id: true }).extend({ created_at: z.string() });

export const organizationSchema = baseOrganizationSchema.omit({ id: true }).extend({ created_at: z.string() });

export const folderSchema = baseFolderSchema.omit({ id: true }).extend({
  created_at: z.string(),
  parent_folder_id: z.preprocess(val => val ?? undefined, z.string().optional()),
});

export const sessionSchema = baseSessionSchema.omit({ id: true }).extend({
  transcript: jsonObject(transcriptSchema),
  created_at: z.string(),
  event_id: z.preprocess(val => val ?? undefined, z.string().optional()),
  folder_id: z.preprocess(val => val ?? undefined, z.string().optional()),
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

export const chatGroupSchema = baseChatGroupSchema.omit({ id: true }).extend({ created_at: z.string() });
export const chatMessageSchema = baseChatMessageSchema.omit({ id: true }).extend({
  created_at: z.string(),
  metadata: jsonObject(z.any()),
  parts: jsonObject(z.any()),
});

export type Human = z.infer<typeof humanSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Folder = z.infer<typeof folderSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type MappingEventParticipant = z.infer<typeof mappingEventParticipantSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type MappingTagSession = z.infer<typeof mappingTagSessionSchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type Config = z.infer<typeof configSchema>;
export type ChatGroup = z.infer<typeof chatGroupSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export type SessionStorage = ToStorageType<typeof sessionSchema>;
export type TemplateStorage = ToStorageType<typeof templateSchema>;
export type ChatMessageStorage = ToStorageType<typeof chatMessageSchema>;
export type ConfigStorage = ToStorageType<typeof configSchema>;

const SCHEMA = {
  value: {} as const satisfies ValuesSchema,
  table: {
    folders: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      name: { type: "string" },
      parent_folder_id: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof folderSchema>,
    sessions: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      folder_id: { type: "string" },
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
    chat_groups: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      title: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof chatGroupSchema>,
    chat_messages: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      chat_group_id: { type: "string" },
      role: { type: "string" },
      content: { type: "string" },
      metadata: { type: "string" },
      parts: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof chatMessageSchema>,
  } as const satisfies TablesSchema,
};

export const TABLES = Object.keys(SCHEMA.table) as (keyof typeof SCHEMA.table)[];

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
  useDidFinishTransactionListener,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

export const StoreComponent = () => {
  const store2 = internal.useStore();

  useDidFinishTransactionListener(
    () => {
      const [changedTables, _changedValues] = store.getTransactionChanges();

      Object.entries(changedTables).forEach(([tableId, rows]) => {
        Object.entries(rows).forEach(([rowId, cells]) => {
          const id = internal.rowIdOfChange(tableId, rowId);

          store2.setRow("changes", id, {
            row_id: rowId,
            table: tableId,
            deleted: !cells,
            updated: !!cells,
          });
        });
      });
    },
    [],
    STORE_ID,
  );

  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value)
  );

  const localPersister = useCreatePersister(
    store,
    (store) =>
      createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
        autoLoadIntervalSeconds: 9999,
      }),
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
          "sessionToFolder",
          "sessions",
          "folders",
          "folder_id",
        )
        .setRelationshipDefinition(
          "folderToParentFolder",
          "folders",
          "folders",
          "parent_folder_id",
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
        )
        .setRelationshipDefinition(
          "chatMessageToGroup",
          "chat_messages",
          "chat_groups",
          "chat_group_id",
        ),
    [],
  )!;

  const queries = useCreateQueries(
    store,
    (store) =>
      createQueries(store)
        .setQueryDefinition(
          QUERIES.eventsWithoutSession,
          "events",
          ({ select, join, where }) => {
            select("title");
            select("started_at");
            select("ended_at");
            select("calendar_id");

            join("sessions", (_getCell, rowId) => {
              let id: string | undefined;
              store.forEachRow("sessions", (sessionRowId, _forEachCell) => {
                if (store.getCell("sessions", sessionRowId, "event_id") === rowId) {
                  id = sessionRowId;
                }
              });
              return id;
            });
            where((getTableCell) => getTableCell("sessions", "event_id") === undefined);
          },
        )
        .setQueryDefinition(
          QUERIES.sessionsWithMaybeEvent,
          "sessions",
          ({ select, join }) => {
            select("title");
            select("created_at");
            select("event_id");
            select("folder_id");

            join("events", "event_id").as("event");
            select("event", "started_at").as("event_started_at");
          },
        ),
    [store2],
  )!;

  const indexes = useCreateIndexes(store, (store) =>
    createIndexes(store)
      .setIndexDefinition(INDEXES.humansByOrg, "humans", "org_id", "name")
      .setIndexDefinition(INDEXES.foldersByParent, "folders", "parent_folder_id", "name")
      .setIndexDefinition(INDEXES.sessionsByFolder, "sessions", "folder_id", "created_at")
      .setIndexDefinition(INDEXES.eventsByCalendar, "events", "calendar_id", "started_at")
      .setIndexDefinition(
        INDEXES.eventsByDate,
        "events",
        (getCell) => {
          const d = new Date(getCell("started_at")!);
          return format(d, "yyyy-MM-dd");
        },
        "started_at",
        (a, b) => a.localeCompare(b),
        (a, b) => String(a).localeCompare(String(b)),
      )
      .setIndexDefinition(
        INDEXES.sessionByDateWithoutEvent,
        "sessions",
        (getCell) => {
          if (getCell("event_id")) {
            return "";
          }

          const d = new Date(getCell("created_at")!);
          return format(d, "yyyy-MM-dd");
        },
        "created_at",
        (a, b) => a.localeCompare(b),
        (a, b) => String(a).localeCompare(String(b)),
      )
      .setIndexDefinition(INDEXES.tagsByName, "tags", "name")
      .setIndexDefinition(INDEXES.tagSessionsBySession, "mapping_tag_session", "session_id")
      .setIndexDefinition(INDEXES.tagSessionsByTag, "mapping_tag_session", "tag_id")
      .setIndexDefinition(INDEXES.chatMessagesByGroup, "chat_messages", "chat_group_id", "created_at"));

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
  eventsWithoutSession: "eventsWithoutSession",
  sessionsWithMaybeEvent: "sessionsWithMaybeEvent",
};

export const METRICS = {
  totalHumans: "totalHumans",
  totalOrganizations: "totalOrganizations",
};

export const INDEXES = {
  humansByOrg: "humansByOrg",
  foldersByParent: "foldersByParent",
  sessionsByFolder: "sessionsByFolder",
  eventsByCalendar: "eventsByCalendar",
  eventsByDate: "eventsByDate",
  sessionByDateWithoutEvent: "sessionByDateWithoutEvent",
  tagsByName: "tagsByName",
  tagSessionsBySession: "tagSessionsBySession",
  tagSessionsByTag: "tagSessionsByTag",
  chatMessagesByGroup: "chatMessagesByGroup",
};

// TODO
export const useConfig = () => {
  const user_id = "0b28fde2-2f07-49da-946c-01fc4b94e9ae";
  const config_id = id();

  const defaultConfig = {
    user_id,
    created_at: new Date().toISOString(),
    autostart: false,
    display_language: "en",
    telemetry_consent: true,
    summary_language: "en",
    notification_before: true,
    notification_auto: true,
    spoken_languages: JSON.stringify(["en"]),
    jargons: JSON.stringify([]),
    save_recordings: false,
    selected_template_id: undefined,
    notification_ignored_platforms: undefined,
    ai_api_base: undefined,
    ai_api_key: undefined,
    ai_specificity: "3",
  } satisfies ToStorageType<typeof configSchema>;

  return { id: config_id, config: defaultConfig };
};
