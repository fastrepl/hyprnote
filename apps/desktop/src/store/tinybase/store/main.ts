import { listen, TauriEvent, type UnlistenFn } from "@tauri-apps/api/event";
import { BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs";
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
} from "tinybase/with-schemas";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { SCHEMA, type Schemas } from "@hypr/store";
import { format } from "@hypr/utils";

import { DEFAULT_USER_ID } from "../../../utils";
import { createLocalPersister } from "../persister/local";
import { createNotePersister } from "../persister/note";
import { maybeImportFromJson } from "./importer";
import { registerSaveHandler } from "./save";
import * as settings from "./settings";

export const STORE_ID = "main";

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

export const StoreComponent = ({ persist = true }: { persist?: boolean }) => {
  const settingsStore = settings.UI.useStore(settings.STORE_ID);

  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value),
  );

  const localPersister = useCreatePersister(
    store,
    async (store) => {
      const persister = createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
      });

      await persister.load();

      if (!persist) {
        return undefined;
      }

      const importResult = await maybeImportFromJson(
        store as Store,
        async () => {
          await persister.save();
        },
      );
      if (importResult.status === "error") {
        console.error("[Store] Import failed:", importResult.error);
      }

      const initializer = async (cb: () => void) => {
        store.transaction(() => cb());
        await persister.save();
      };

      void initializer(() => {
        if (!store.hasValue("user_id")) {
          store.setValue("user_id", DEFAULT_USER_ID);
        }

        const userId = store.getValue("user_id") as string;
        if (!store.hasRow("humans", userId)) {
          store.setRow("humans", userId, {
            user_id: userId,
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

  const markdownPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

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

      const persister = createNotePersister<Schemas>(
        store as Store,
        (sessionId: string, content: string) =>
          store.setPartialRow("sessions", sessionId, {
            enhanced_md: content,
          }),
      );

      return persister;
    },
    [persist, settingsStore],
  );

  useEffect(() => {
    if (!persist || !localPersister || !markdownPersister) {
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
        async () => {
          try {
            await Promise.all([
              markdownPersister.save(),
              localPersister.save(),
            ]);
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
            await Promise.all([
              markdownPersister.save(),
              localPersister.save(),
            ]);
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
  }, [localPersister, markdownPersister, persist]);

  useEffect(() => {
    if (!persist || !localPersister || !markdownPersister) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    return registerSaveHandler(async () => {
      await Promise.all([markdownPersister.save(), localPersister.save()]);
    });
  }, [localPersister, markdownPersister, persist]);

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
        .setQueryDefinition(
          QUERIES.visibleChatShortcuts,
          "chat_shortcuts",
          ({ select }) => {
            select("user_id");
            select("title");
            select("content");
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
      .setIndexDefinition(INDEXES.wordsByTranscript, "words", "transcript_id")
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
        "created_at",
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
  useProvidePersister("markdown", persist ? markdownPersister : undefined);
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
  visibleFolders: "visibleFolders",
  visibleVocabs: "visibleVocabs",
  sessionParticipantsWithDetails: "sessionParticipantsWithDetails",
  sessionRecordingTimes: "sessionRecordingTimes",
  enabledAppleCalendars: "enabledAppleCalendars",
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
  sessionToFolder: "sessionToFolder",
  sessionToEvent: "sessionToEvent",
  folderToParentFolder: "folderToParentFolder",
  enhancedNoteToSession: "enhancedNoteToSession",
};
