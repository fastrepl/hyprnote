import { format } from "@hypr/utils";
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
  eventSchema as baseEventSchema,
  folderSchema as baseFolderSchema,
  humanSchema as baseHumanSchema,
  mappingSessionParticipantSchema as baseMappingSessionParticipantSchema,
  mappingTagSessionSchema as baseMappingTagSessionSchema,
  organizationSchema as baseOrganizationSchema,
  sessionSchema as baseSessionSchema,
  TABLE_HUMANS,
  TABLE_SESSIONS,
  tagSchema as baseTagSchema,
  templateSchema as baseTemplateSchema,
  transcriptSchema as baseTranscriptSchema,
  wordSchema,
} from "@hypr/db";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import * as internal from "./internal";
import { createLocalPersister } from "./localPersister";
import { type InferTinyBaseSchema, jsonObject, type ToStorageType } from "./shared";

export const STORE_ID = "persisted";

export const humanSchema = baseHumanSchema.omit({ id: true }).extend({
  created_at: z.string(),
  job_title: z.preprocess(val => val ?? undefined, z.string().optional()),
  linkedin_username: z.preprocess(val => val ?? undefined, z.string().optional()),
  is_user: z.preprocess(val => val ?? undefined, z.boolean().optional()),
  memo: z.preprocess(val => val ?? undefined, z.string().optional()),
});

export const eventSchema = baseEventSchema.omit({ id: true }).extend({
  created_at: z.string(),
  started_at: z.string(),
  ended_at: z.string(),
  location: z.preprocess(val => val ?? undefined, z.string().optional()),
  meeting_link: z.preprocess(val => val ?? undefined, z.string().optional()),
  description: z.preprocess(val => val ?? undefined, z.string().optional()),
  note: z.preprocess(val => val ?? undefined, z.string().optional()),
});

export const calendarSchema = baseCalendarSchema.omit({ id: true }).extend({ created_at: z.string() });

export const organizationSchema = baseOrganizationSchema.omit({ id: true }).extend({ created_at: z.string() });

export const folderSchema = baseFolderSchema.omit({ id: true }).extend({
  created_at: z.string(),
  parent_folder_id: z.preprocess(val => val ?? undefined, z.string().optional()),
});

export const sessionSchema = baseSessionSchema.omit({ id: true }).extend({
  created_at: z.string(),
  event_id: z.preprocess(val => val ?? undefined, z.string().optional()),
  folder_id: z.preprocess(val => val ?? undefined, z.string().optional()),
});

export const transcriptSchema = baseTranscriptSchema.omit({ id: true }).extend({
  created_at: z.string(),
});

export const mappingSessionParticipantSchema = baseMappingSessionParticipantSchema.omit({ id: true }).extend({
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

export const chatGroupSchema = baseChatGroupSchema.omit({ id: true }).extend({ created_at: z.string() });
export const chatMessageSchema = baseChatMessageSchema.omit({ id: true }).extend({
  created_at: z.string(),
  metadata: jsonObject(z.any()),
  parts: jsonObject(z.any()),
});

export const wordSchemaOverride = wordSchema.omit({ id: true }).extend({
  created_at: z.string(),
  speaker: z.preprocess(val => val ?? undefined, z.string().optional()),
  transcript_id: z.string(),
});

export type Human = z.infer<typeof humanSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Folder = z.infer<typeof folderSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Transcript = z.infer<typeof transcriptSchema>;
export type Word = z.infer<typeof wordSchemaOverride>;
export type mappingSessionParticipant = z.infer<typeof mappingSessionParticipantSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type MappingTagSession = z.infer<typeof mappingTagSessionSchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type ChatGroup = z.infer<typeof chatGroupSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export type SessionStorage = ToStorageType<typeof sessionSchema>;
export type TranscriptStorage = ToStorageType<typeof transcriptSchema>;
export type TemplateStorage = ToStorageType<typeof templateSchema>;
export type ChatMessageStorage = ToStorageType<typeof chatMessageSchema>;

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
    } satisfies InferTinyBaseSchema<typeof sessionSchema>,
    transcripts: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      session_id: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof transcriptSchema>,
    words: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      text: { type: "string" },
      transcript_id: { type: "string" },
      start_ms: { type: "number" },
      end_ms: { type: "number" },
      channel: { type: "number" },
    } satisfies InferTinyBaseSchema<typeof wordSchema>,
    humans: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      org_id: { type: "string" },
      job_title: { type: "string" },
      linkedin_username: { type: "string" },
      is_user: { type: "boolean" },
      memo: { type: "string" },
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
      location: { type: "string" },
      meeting_link: { type: "string" },
      description: { type: "string" },
      note: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof eventSchema>,
    mapping_session_participant: {
      user_id: { type: "string" },
      created_at: { type: "string" },
      session_id: { type: "string" },
      human_id: { type: "string" },
    } satisfies InferTinyBaseSchema<typeof mappingSessionParticipantSchema>,
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
  useProvideSynchronizer,
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
        if (!rows) {
          return;
        }

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

  const synchronizer = useCreateSynchronizer(
    store,
    async (store) =>
      createBroadcastChannelSynchronizer(
        store,
        "hypr-sync-persisted",
      ).startSync(),
  );

  const relationships = useCreateRelationships(
    store,
    (store) =>
      createRelationships(store)
        .setRelationshipDefinition(
          RELATIONSHIPS.sessionHuman,
          TABLE_SESSIONS,
          TABLE_HUMANS,
          "user_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.sessionToFolder,
          "sessions",
          "folders",
          "folder_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.sessionToEvent,
          "sessions",
          "events",
          "event_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.folderToParentFolder,
          "folders",
          "folders",
          "parent_folder_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.transcriptToSession,
          "transcripts",
          "sessions",
          "session_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.wordToTranscript,
          "words",
          "transcripts",
          "transcript_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.sessionParticipantToHuman,
          "mapping_session_participant",
          "humans",
          "human_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.sessionParticipantToSession,
          "mapping_session_participant",
          "sessions",
          "session_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.eventToCalendar,
          "events",
          "calendars",
          "calendar_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.tagSessionToTag,
          "mapping_tag_session",
          "tags",
          "tag_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.tagSessionToSession,
          "mapping_tag_session",
          "sessions",
          "session_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.chatMessageToGroup,
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
            }).as("session");
            where((getTableCell) => !getTableCell("session", "user_id"));
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
        )
        .setQueryDefinition(
          QUERIES.visibleHumans,
          "humans",
          ({ select }) => {
            select("name");
            select("email");
            select("org_id");
            select("job_title");
            select("linkedin_username");
            select("is_user");
            select("created_at");
          },
        )
        .setQueryDefinition(
          QUERIES.visibleOrganizations,
          "organizations",
          ({ select }) => {
            select("name");
            select("created_at");
          },
        )
        .setQueryDefinition(
          QUERIES.visibleTemplates,
          "templates",
          ({ select }) => {
            select("title");
            select("description");
            select("sections");
            select("created_at");
          },
        )
        .setQueryDefinition(
          QUERIES.visibleFolders,
          "folders",
          ({ select }) => {
            select("name");
            select("parent_folder_id");
            select("created_at");
          },
        ),
    [store2],
  )!;

  const indexes = useCreateIndexes(store, (store) =>
    createIndexes(store)
      .setIndexDefinition(INDEXES.humansByOrg, "humans", "org_id", "name")
      .setIndexDefinition(INDEXES.sessionParticipantsBySession, "mapping_session_participant", "session_id")
      .setIndexDefinition(INDEXES.sessionsByHuman, "mapping_session_participant", "human_id")
      .setIndexDefinition(INDEXES.foldersByParent, "folders", "parent_folder_id", "name")
      .setIndexDefinition(INDEXES.sessionsByFolder, "sessions", "folder_id", "created_at")
      .setIndexDefinition(INDEXES.transcriptBySession, "transcripts", "session_id")
      .setIndexDefinition(INDEXES.wordsByTranscript, "words", "transcript_id", "start_ms")
      .setIndexDefinition(INDEXES.eventsByCalendar, "events", "calendar_id", "started_at")
      .setIndexDefinition(
        INDEXES.eventsByDate,
        "events",
        (getCell) => {
          const cell = getCell("started_at");
          if (!cell) {
            return "";
          }

          const d = new Date(cell);
          if (isNaN(d.getTime())) {
            return "";
          }

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

          const cell = getCell("created_at");
          if (!cell) {
            return "";
          }

          const d = new Date(cell);
          if (isNaN(d.getTime())) {
            return "";
          }

          return format(d, "yyyy-MM-dd");
        },
        "created_at",
        (a, b) => a.localeCompare(b),
        (a, b) => String(a).localeCompare(String(b)),
      )
      .setIndexDefinition(INDEXES.sessionsByEvent, "sessions", "event_id", "created_at")
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
  useProvidePersister(STORE_ID, localPersister);
  useProvideSynchronizer(STORE_ID, synchronizer);

  return null;
};

export const QUERIES = {
  eventsWithoutSession: "eventsWithoutSession",
  sessionsWithMaybeEvent: "sessionsWithMaybeEvent",
  visibleOrganizations: "visibleOrganizations",
  visibleHumans: "visibleHumans",
  visibleTemplates: "visibleTemplates",
  visibleFolders: "visibleFolders",
};

export const METRICS = {
  totalHumans: "totalHumans",
  totalOrganizations: "totalOrganizations",
};

export const INDEXES = {
  humansByOrg: "humansByOrg",
  sessionParticipantsBySession: "sessionParticipantsBySession",
  foldersByParent: "foldersByParent",
  sessionsByFolder: "sessionsByFolder",
  transcriptBySession: "transcriptBySession",
  wordsByTranscript: "wordsByTranscript",
  eventsByCalendar: "eventsByCalendar",
  eventsByDate: "eventsByDate",
  sessionByDateWithoutEvent: "sessionByDateWithoutEvent",
  sessionsByEvent: "sessionsByEvent",
  tagsByName: "tagsByName",
  tagSessionsBySession: "tagSessionsBySession",
  tagSessionsByTag: "tagSessionsByTag",
  chatMessagesByGroup: "chatMessagesByGroup",
  sessionsByHuman: "sessionsByHuman",
};

export const RELATIONSHIPS = {
  sessionHuman: "sessionHuman",
  sessionToFolder: "sessionToFolder",
  sessionToEvent: "sessionToEvent",
  folderToParentFolder: "folderToParentFolder",
  transcriptToSession: "transcriptToSession",
  wordToTranscript: "wordToTranscript",
  sessionParticipantToHuman: "sessionParticipantToHuman",
  sessionParticipantToSession: "sessionParticipantToSession",
  eventToCalendar: "eventToCalendar",
  tagSessionToTag: "tagSessionToTag",
  tagSessionToSession: "tagSessionToSession",
  chatMessageToGroup: "chatMessageToGroup",
};
