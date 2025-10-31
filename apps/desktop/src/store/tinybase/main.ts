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

import { TABLE_HUMANS, TABLE_SESSIONS } from "@hypr/db";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import { DEFAULT_USER_ID } from "../../utils";
import { createLocalPersister } from "./localPersister";
import { externalTableSchemaForTinybase } from "./schema-external";
import { internalSchemaForTinybase } from "./schema-internal";

export * from "./schema-external";
export * from "./schema-internal";

export const STORE_ID = "main";

const SCHEMA = {
  value: {
    ...internalSchemaForTinybase.value,
  } as const satisfies ValuesSchema,
  table: {
    ...externalTableSchemaForTinybase,
    ...internalSchemaForTinybase.table,
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
  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value)
  );
  store.setValue("user_id", DEFAULT_USER_ID);

  useDidFinishTransactionListener(
    () => {
      const [changedTables, _changedValues] = store.getTransactionChanges();

      Object.entries(changedTables).forEach(([tableId, rows]) => {
        if (!rows) {
          return;
        }

        Object.entries(rows).forEach(([rowId, cells]) => {
          const id = rowIdOfChange(tableId, rowId);

          store.setRow("changes", id, {
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

  const localPersister = useCreatePersister(
    store,
    (store) =>
      createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
      }),
    [],
    async (persister) => await persister.startAutoPersisting(),
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
        )
        .setQueryDefinition(
          QUERIES.visibleVocabs,
          "memories",
          ({ select, where }) => {
            select("text");
            select("created_at");
            where((getCell) => getCell("type") === "vocab");
          },
        )
        .setQueryDefinition(
          QUERIES.llmProviders,
          "ai_providers",
          ({ select, where }) => {
            select("type");
            select("base_url");
            select("api_key");
            where((getCell) => getCell("type") === "llm");
          },
        )
        .setQueryDefinition(
          QUERIES.sttProviders,
          "ai_providers",
          ({ select, where }) => {
            select("type");
            select("base_url");
            select("api_key");
            where((getCell) => getCell("type") === "stt");
          },
        ),
    [],
  )!;

  const indexes = useCreateIndexes(store, (store) =>
    createIndexes(store)
      .setIndexDefinition(INDEXES.humansByOrg, "humans", "org_id", "name")
      .setIndexDefinition(INDEXES.sessionParticipantsBySession, "mapping_session_participant", "session_id")
      .setIndexDefinition(INDEXES.sessionsByHuman, "mapping_session_participant", "human_id")
      .setIndexDefinition(INDEXES.foldersByParent, "folders", "parent_folder_id", "name")
      .setIndexDefinition(INDEXES.sessionsByFolder, "sessions", "folder_id", "created_at")
      .setIndexDefinition(INDEXES.transcriptBySession, "transcripts", "session_id", "created_at")
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

export const rowIdOfChange = (table: string, row: string) => `${table}:${row}`;

export const QUERIES = {
  eventsWithoutSession: "eventsWithoutSession",
  sessionsWithMaybeEvent: "sessionsWithMaybeEvent",
  visibleOrganizations: "visibleOrganizations",
  visibleHumans: "visibleHumans",
  visibleTemplates: "visibleTemplates",
  visibleFolders: "visibleFolders",
  visibleVocabs: "visibleVocabs",
  llmProviders: "llmProviders",
  sttProviders: "sttProviders",
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
