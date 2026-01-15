import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createCheckpoints,
  createIndexes,
  createMergeableStore,
  createMetrics,
  createQueries,
  createRelationships,
  type MergeableStore,
} from "tinybase/with-schemas";

import { SCHEMA, type Schemas } from "@hypr/store";
import { format } from "@hypr/utils";

import { useMainPersisters } from "./persisters";

export const STORE_ID = "main";

export const TABLES = Object.keys(
  SCHEMA.table,
) as (keyof typeof SCHEMA.table)[];

const {
  useCreateMergeableStore,
  useCreateSynchronizer,
  useCreateRelationships,
  useCreateQueries,
  useProvideStore,
  useProvideIndexes,
  useProvideRelationships,
  useProvideMetrics,
  useCreateIndexes,
  useCreateMetrics,
  useProvideQueries,
  useProvideSynchronizer,
  useCreateCheckpoints,
  useProvideCheckpoints,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type { Schemas };

export const testUtils = {
  useCreateMergeableStore,
  useProvideStore,
  useProvideIndexes,
  useProvideRelationships,
  useProvideQueries,
  useCreateIndexes,
  useCreateRelationships,
  useCreateQueries,
  createMergeableStore,
  createIndexes,
  createQueries,
  createRelationships,
  SCHEMA,
};

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value),
  );

  useMainPersisters(store as Store);

  const synchronizer = useCreateSynchronizer(store, async (store) =>
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
          RELATIONSHIPS.sessionToEvent,
          "sessions",
          "events",
          "event_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.enhancedNoteToSession,
          "enhanced_notes",
          "sessions",
          "session_id",
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
                if (
                  store.getCell("sessions", sessionRowId, "event_id") === rowId
                ) {
                  id = sessionRowId;
                }
              });
              return id;
            }).as("session");
            where(
              (getTableCell) =>
                !getTableCell("session", "user_id") &&
                !getTableCell("events", "ignored"),
            );
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
        .setQueryDefinition(QUERIES.visibleHumans, "humans", ({ select }) => {
          select("name");
          select("email");
          select("org_id");
          select("job_title");
          select("linkedin_username");
          select("pinned");
          select("pin_order");
        })
        .setQueryDefinition(
          QUERIES.visibleOrganizations,
          "organizations",
          ({ select }) => {
            select("name");
          },
        )
        .setQueryDefinition(
          QUERIES.visibleTemplates,
          "templates",
          ({ select }) => {
            select("title");
            select("description");
            select("sections");
          },
        )
        .setQueryDefinition(
          QUERIES.visibleChatShortcuts,
          "chat_shortcuts",
          ({ select }) => {
            select("user_id");
            select("title");
            select("content");
          },
        )
        .setQueryDefinition(
          QUERIES.sessionParticipantsWithDetails,
          "mapping_session_participant",
          ({ select, join }) => {
            select("session_id");
            select("human_id");

            join("humans", "human_id").as("human");
            select("human", "name").as("human_name");
            select("human", "email").as("human_email");
            select("human", "job_title").as("human_job_title");
            select("human", "linkedin_username").as("human_linkedin_username");
            select("human", "org_id").as("org_id");

            join("organizations", "human", "org_id").as("org");
            select("org", "name").as("org_name");
          },
        )
        .setQueryDefinition(
          QUERIES.sessionRecordingTimes,
          "transcripts",
          ({ select, group }) => {
            select("session_id");
            select("started_at");
            select("ended_at");

            group("started_at", "min").as("min_started_at");
            group("ended_at", "max").as("max_ended_at");
          },
        )
        .setQueryDefinition(
          QUERIES.enabledAppleCalendars,
          "calendars",
          ({ select, where }) => {
            select("provider");
            where(
              (getCell) =>
                getCell("enabled") === true && getCell("provider") === "apple",
            );
          },
        ),
    [],
  )!;

  const indexes = useCreateIndexes(store, (store) =>
    createIndexes(store)
      .setIndexDefinition(INDEXES.humansByOrg, "humans", "org_id", "name")
      .setIndexDefinition(INDEXES.humansByEmail, "humans", "email")
      .setIndexDefinition(
        INDEXES.sessionParticipantsBySession,
        "mapping_session_participant",
        "session_id",
      )
      .setIndexDefinition(
        INDEXES.sessionsByHuman,
        "mapping_session_participant",
        "human_id",
      )
      .setIndexDefinition(
        INDEXES.sessionsByFolder,
        "sessions",
        "folder_id",
        "created_at",
      )
      .setIndexDefinition(
        INDEXES.transcriptBySession,
        "transcripts",
        "session_id",
        "created_at",
      )
      .setIndexDefinition(
        INDEXES.eventsByDate,
        "events",
        (getCell) => {
          const cell = getCell("started_at");
          if (!cell) {
            return "";
          }

          if (Array.isArray(cell)) {
            console.error("[TinyBase Stamp Leak] eventsByDate received stamped value:", cell);
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

          if (Array.isArray(cell)) {
            console.error("[TinyBase Stamp Leak] sessionByDateWithoutEvent received stamped value:", cell);
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
      .setIndexDefinition(
        INDEXES.sessionsByEvent,
        "sessions",
        "event_id",
        "created_at",
      )
      .setIndexDefinition(
        INDEXES.tagSessionsBySession,
        "mapping_tag_session",
        "session_id",
      )
      .setIndexDefinition(
        INDEXES.chatMessagesByGroup,
        "chat_messages",
        "chat_group_id",
        "created_at",
      )
      .setIndexDefinition(
        INDEXES.enhancedNotesBySession,
        "enhanced_notes",
        "session_id",
        "position",
      )
      .setIndexDefinition(
        INDEXES.enhancedNotesByTemplate,
        "enhanced_notes",
        "template_id",
        "position",
      ),
  );

  const metrics = useCreateMetrics(store, (store) =>
    createMetrics(store)
      .setMetricDefinition(METRICS.totalHumans, "humans", "sum", () => 1)
      .setMetricDefinition(
        METRICS.totalOrganizations,
        "organizations",
        "sum",
        () => 1,
      ),
  );

  const checkpoints = useCreateCheckpoints(store, (store) =>
    createCheckpoints(store),
  );

  useProvideStore(STORE_ID, store);
  useProvideRelationships(STORE_ID, relationships);
  useProvideQueries(STORE_ID, queries!);
  useProvideIndexes(STORE_ID, indexes!);
  useProvideMetrics(STORE_ID, metrics!);
  useProvideSynchronizer(STORE_ID, synchronizer);
  useProvideCheckpoints(STORE_ID, checkpoints!);

  return null;
};

export const rowIdOfChange = (table: string, row: string) => `${table}:${row}`;

export const QUERIES = {
  eventsWithoutSession: "eventsWithoutSession",
  sessionsWithMaybeEvent: "sessionsWithMaybeEvent",
  visibleOrganizations: "visibleOrganizations",
  visibleHumans: "visibleHumans",
  visibleTemplates: "visibleTemplates",
  visibleChatShortcuts: "visibleChatShortcuts",
  sessionParticipantsWithDetails: "sessionParticipantsWithDetails",
  sessionRecordingTimes: "sessionRecordingTimes",
  enabledAppleCalendars: "enabledAppleCalendars",
};

export const METRICS = {
  totalHumans: "totalHumans",
  totalOrganizations: "totalOrganizations",
};

export const INDEXES = {
  humansByOrg: "humansByOrg",
  humansByEmail: "humansByEmail",
  sessionParticipantsBySession: "sessionParticipantsBySession",
  sessionsByFolder: "sessionsByFolder",
  transcriptBySession: "transcriptBySession",
  eventsByDate: "eventsByDate",
  sessionByDateWithoutEvent: "sessionByDateWithoutEvent",
  sessionsByEvent: "sessionsByEvent",
  tagSessionsBySession: "tagSessionsBySession",
  chatMessagesByGroup: "chatMessagesByGroup",
  sessionsByHuman: "sessionsByHuman",
  enhancedNotesBySession: "enhancedNotesBySession",
  enhancedNotesByTemplate: "enhancedNotesByTemplate",
};

export const RELATIONSHIPS = {
  sessionToEvent: "sessionToEvent",
  enhancedNoteToSession: "enhancedNoteToSession",
};
