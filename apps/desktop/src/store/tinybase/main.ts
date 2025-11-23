import { listen, TauriEvent, type UnlistenFn } from "@tauri-apps/api/event";
import {
  BaseDirectory,
  exists,
  mkdir,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { useEffect } from "react";
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
  type TablesSchema,
  ValuesSchema,
} from "tinybase/with-schemas";

import { TABLE_HUMANS, TABLE_SESSIONS } from "@hypr/db";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { format } from "@hypr/utils";

import { DEFAULT_USER_ID } from "../../utils";
import { createLocalPersister } from "./localPersister";
import { createLocalPersister2 } from "./localPersister2";
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

export const TABLES = Object.keys(
  SCHEMA.table,
) as (keyof typeof SCHEMA.table)[];

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
  useCreateCheckpoints,
  useProvideCheckpoints,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

export const StoreComponent = ({ persist = true }: { persist?: boolean }) => {
  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value),
  );

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

          if (tableId === TABLE_SESSIONS && cells && "raw_md" in cells) {
            const rawMd = store.getCell("sessions", rowId, "raw_md");
            if (typeof rawMd === "string") {
              const userId = store.getCell("sessions", rowId, "user_id");
              const createdAtMs = Date.now();

              let transcriptId: string | undefined;
              store.forEachRow("transcripts", (tId, _forEachCell) => {
                const tSessionId = store.getCell(
                  "transcripts",
                  tId,
                  "session_id",
                );
                if (tSessionId === rowId) {
                  transcriptId = tId;
                }
              });

              const historyId = crypto.randomUUID();
              store.setRow("note_history", historyId, {
                user_id: typeof userId === "string" ? userId : DEFAULT_USER_ID,
                created_at: new Date().toISOString(),
                session_id: rowId,
                content: rawMd,
                created_at_ms: createdAtMs,
                transcript_id: transcriptId,
              });
            }
          }
        });
      });
    },
    [],
    STORE_ID,
  );

  const localPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      const persister = createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
      });

      const initializer = async (cb: () => void) => {
        await persister.load();
        store.transaction(() => cb());
        await persister.save();
      };

      void initializer(() => {
        if (!store.hasValue("user_id")) {
          store.setValue("user_id", DEFAULT_USER_ID);
        }
        if (!store.hasRow("humans", DEFAULT_USER_ID)) {
          store.setRow("humans", DEFAULT_USER_ID, {
            created_at: new Date().toISOString(),
          });
        }

        if (
          !store.getTableIds().includes("sessions") ||
          store.getRowIds("sessions").length === 0
        ) {
          const sessionId = crypto.randomUUID();
          const now = new Date().toISOString();

          store.setRow("sessions", sessionId, {
            user_id: DEFAULT_USER_ID,
            created_at: now,
            title: "Welcome to Hyprnote",
            raw_md: "",
            enhanced_md: "",
          });
        }
      });

      await persister.startAutoLoad();
      return persister;
    },
    [persist],
  );

  const localPersister2 = useCreatePersister(
    store,
    async (store) => {
      try {
        const dirExists = await exists("hyprnote/sessions", {
          baseDir: BaseDirectory.Data,
        });
        if (!dirExists) {
          await mkdir("hyprnote/sessions", {
            baseDir: BaseDirectory.Data,
            recursive: true,
          });
        }
      } catch (error) {
        console.error("Failed to create sessions directory:", error);
        throw error;
      }

      const persister = createLocalPersister2<Schemas>(
        store as Store,
        async (session) => {
          if (session.enhanced_md) {
            await writeTextFile(
              `hyprnote/sessions/${session.id}.md`,
              session.enhanced_md,
              {
                baseDir: BaseDirectory.Data,
              },
            );
          }
        },
      );

      return persister;
    },
    [],
  );

  useEffect(() => {
    if (!persist || !localPersister || !localPersister2) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let unlistenClose: UnlistenFn | undefined;
    let unlistenBlur: UnlistenFn | undefined;

    const register = async () => {
      unlistenClose = await listen(
        TauriEvent.WINDOW_CLOSE_REQUESTED,
        // We call prevent_close in the rust side
        async () => {
          try {
            await Promise.all([localPersister2.save(), localPersister.save()]);
          } catch (error) {
            console.error(error);
          }
        },
        { target: { kind: "WebviewWindow", label: "main" } },
      );

      unlistenBlur = await listen(
        TauriEvent.WINDOW_BLUR,
        async () => {
          try {
            await Promise.all([localPersister2.save(), localPersister.save()]);
          } catch (error) {
            console.error(error);
          }
        },
        { target: { kind: "WebviewWindow", label: "main" } },
      );
    };

    void register();

    return () => {
      unlistenBlur?.();
      unlistenClose?.();
    };
  }, [localPersister, localPersister2, persist]);

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
          RELATIONSHIPS.speakerHintToTranscript,
          "speaker_hints",
          "transcripts",
          "transcript_id",
        )
        .setRelationshipDefinition(
          RELATIONSHIPS.speakerHintToWord,
          "speaker_hints",
          "words",
          "word_id",
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
        .setQueryDefinition(QUERIES.visibleHumans, "humans", ({ select }) => {
          select("name");
          select("email");
          select("org_id");
          select("job_title");
          select("linkedin_username");
          select("is_user");
          select("created_at");
        })
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
        .setQueryDefinition(QUERIES.visibleFolders, "folders", ({ select }) => {
          select("name");
          select("parent_folder_id");
          select("created_at");
        })
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
        )
        .setQueryDefinition(
          QUERIES.sessionParticipantsWithDetails,
          "mapping_session_participant",
          ({ select, join }) => {
            select("session_id");
            select("human_id");
            select("created_at");

            join("humans", "human_id").as("human");
            select("human", "name").as("human_name");
            select("human", "email").as("human_email");
            select("human", "job_title").as("human_job_title");
            select("human", "linkedin_username").as("human_linkedin_username");
            select("human", "org_id").as("org_id");
            select("human", "is_user").as("human_is_user");

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
        ),
    [],
  )!;

  const indexes = useCreateIndexes(store, (store) =>
    createIndexes(store)
      .setIndexDefinition(INDEXES.humansByOrg, "humans", "org_id", "name")
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
        INDEXES.foldersByParent,
        "folders",
        "parent_folder_id",
        "name",
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
        INDEXES.wordsByTranscript,
        "words",
        "transcript_id",
        "start_ms",
      )
      .setIndexDefinition(
        INDEXES.speakerHintsByTranscript,
        "speaker_hints",
        "transcript_id",
        "created_at",
      )
      .setIndexDefinition(
        INDEXES.speakerHintsByWord,
        "speaker_hints",
        "word_id",
      )
      .setIndexDefinition(
        INDEXES.eventsByCalendar,
        "events",
        "calendar_id",
        "started_at",
      )
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
      .setIndexDefinition(
        INDEXES.sessionsByEvent,
        "sessions",
        "event_id",
        "created_at",
      )
      .setIndexDefinition(INDEXES.tagsByName, "tags", "name")
      .setIndexDefinition(
        INDEXES.tagSessionsBySession,
        "mapping_tag_session",
        "session_id",
      )
      .setIndexDefinition(
        INDEXES.tagSessionsByTag,
        "mapping_tag_session",
        "tag_id",
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
      )
      .setMetricDefinition(
        METRICS.totalCustomVocabs,
        "memories",
        "sum",
        (getCell) => (getCell("type") === "vocab" ? 1 : 0),
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
  useProvidePersister(STORE_ID, persist ? localPersister : undefined);
  useProvidePersister("TODO", persist ? localPersister2 : undefined);
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
  visibleFolders: "visibleFolders",
  visibleVocabs: "visibleVocabs",
  llmProviders: "llmProviders",
  sttProviders: "sttProviders",
  sessionParticipantsWithDetails: "sessionParticipantsWithDetails",
  sessionRecordingTimes: "sessionRecordingTimes",
};

export const METRICS = {
  totalHumans: "totalHumans",
  totalOrganizations: "totalOrganizations",
  totalCustomVocabs: "totalCustomVocabs",
};

export const INDEXES = {
  humansByOrg: "humansByOrg",
  sessionParticipantsBySession: "sessionParticipantsBySession",
  foldersByParent: "foldersByParent",
  sessionsByFolder: "sessionsByFolder",
  transcriptBySession: "transcriptBySession",
  wordsByTranscript: "wordsByTranscript",
  speakerHintsByTranscript: "speakerHintsByTranscript",
  speakerHintsByWord: "speakerHintsByWord",
  eventsByCalendar: "eventsByCalendar",
  eventsByDate: "eventsByDate",
  sessionByDateWithoutEvent: "sessionByDateWithoutEvent",
  sessionsByEvent: "sessionsByEvent",
  tagsByName: "tagsByName",
  tagSessionsBySession: "tagSessionsBySession",
  tagSessionsByTag: "tagSessionsByTag",
  chatMessagesByGroup: "chatMessagesByGroup",
  sessionsByHuman: "sessionsByHuman",
  enhancedNotesBySession: "enhancedNotesBySession",
};

export const RELATIONSHIPS = {
  sessionHuman: "sessionHuman",
  sessionToFolder: "sessionToFolder",
  sessionToEvent: "sessionToEvent",
  folderToParentFolder: "folderToParentFolder",
  transcriptToSession: "transcriptToSession",
  wordToTranscript: "wordToTranscript",
  speakerHintToTranscript: "speakerHintToTranscript",
  speakerHintToWord: "speakerHintToWord",
  sessionParticipantToHuman: "sessionParticipantToHuman",
  sessionParticipantToSession: "sessionParticipantToSession",
  eventToCalendar: "eventToCalendar",
  tagSessionToTag: "tagSessionToTag",
  tagSessionToSession: "tagSessionToSession",
  chatMessageToGroup: "chatMessageToGroup",
  enhancedNoteToSession: "enhancedNoteToSession",
};
