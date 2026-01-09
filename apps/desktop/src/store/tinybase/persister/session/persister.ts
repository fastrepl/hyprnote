import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { Content } from "tinybase/with-schemas";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCollectorPersister } from "../factories";
import {
  asTablesChanges,
  type ChangedTables,
  type CollectorResult,
  createDeletionMarker,
  getDataDir,
  type TablesContent,
} from "../shared";
import {
  collectNoteWriteOps,
  collectSessionWriteOps,
  collectTranscriptWriteOps,
  type NoteCollectorResult,
  type SessionCollectorResult,
} from "./collect";
import {
  loadAllSessionData,
  loadSingleSession,
  type SessionDataLoad,
} from "./load";

function createSessionDeletionMarker(store: Store) {
  return createDeletionMarker<SessionDataLoad>(store, [
    { tableName: "sessions", isPrimary: true },
    { tableName: "mapping_session_participant", foreignKey: "session_id" },
    { tableName: "tags" },
    { tableName: "mapping_tag_session", foreignKey: "session_id" },
    { tableName: "transcripts", foreignKey: "session_id" },
    { tableName: "enhanced_notes", foreignKey: "session_id" },
  ]);
}

function parseSessionIdFromPath(path: string): string | null {
  const parts = path.split("/");
  const sessionsIndex = parts.indexOf("sessions");
  if (sessionsIndex === -1 || sessionsIndex + 1 >= parts.length) {
    return null;
  }
  return parts[sessionsIndex + 1] || null;
}

type ChangeResult = {
  changedSessionIds: Set<string>;
  hasUnresolvedDeletions: boolean;
};

function getChangedSessionIds(
  tables: TablesContent,
  changedTables: ChangedTables,
): ChangeResult | undefined {
  const changedSessionIds = new Set<string>();
  let hasUnresolvedDeletions = false;

  const changedSessions = changedTables.sessions;
  if (changedSessions) {
    for (const id of Object.keys(changedSessions)) {
      changedSessionIds.add(id);
    }
  }

  const changedParticipants = changedTables.mapping_session_participant;
  if (changedParticipants) {
    for (const id of Object.keys(changedParticipants)) {
      const sessionId = tables.mapping_session_participant?.[id]?.session_id;
      if (sessionId) {
        changedSessionIds.add(sessionId);
      } else {
        hasUnresolvedDeletions = true;
      }
    }
  }

  const changedTranscripts = changedTables.transcripts;
  if (changedTranscripts) {
    for (const id of Object.keys(changedTranscripts)) {
      const transcript = tables.transcripts?.[id];
      if (transcript?.session_id) {
        changedSessionIds.add(transcript.session_id);
      } else {
        hasUnresolvedDeletions = true;
      }
    }
  }

  const changedWords = changedTables.words;
  if (changedWords) {
    for (const id of Object.keys(changedWords)) {
      const word = tables.words?.[id];
      if (word?.transcript_id) {
        const transcript = tables.transcripts?.[word.transcript_id];
        if (transcript?.session_id) {
          changedSessionIds.add(transcript.session_id);
        }
      }
    }
  }

  const changedSpeakerHints = changedTables.speaker_hints;
  if (changedSpeakerHints) {
    for (const id of Object.keys(changedSpeakerHints)) {
      const hint = tables.speaker_hints?.[id];
      if (hint?.transcript_id) {
        const transcript = tables.transcripts?.[hint.transcript_id];
        if (transcript?.session_id) {
          changedSessionIds.add(transcript.session_id);
        }
      }
    }
  }

  const changedEnhancedNotes = changedTables.enhanced_notes;
  if (changedEnhancedNotes) {
    for (const id of Object.keys(changedEnhancedNotes)) {
      const note = tables.enhanced_notes?.[id];
      if (note?.session_id) {
        changedSessionIds.add(note.session_id);
      } else {
        hasUnresolvedDeletions = true;
      }
    }
  }

  if (changedSessionIds.size === 0 && !hasUnresolvedDeletions) {
    return undefined;
  }

  return { changedSessionIds, hasUnresolvedDeletions };
}

export function createSessionPersister(store: Store) {
  const deletionMarker = createSessionDeletionMarker(store);

  return createCollectorPersister(store, {
    label: "SessionPersister",
    watchPaths: ["sessions/"],
    postSaveAlways: true,
    entityParser: parseSessionIdFromPath,
    loadSingle: async (sessionId: string) => {
      try {
        const dataDir = await getDataDir();
        const data = await loadSingleSession(dataDir, sessionId);

        const result = deletionMarker.markForEntity(data, sessionId);

        const hasChanges =
          Object.keys(result.sessions).length > 0 ||
          Object.keys(result.mapping_session_participant).length > 0 ||
          Object.keys(result.tags).length > 0 ||
          Object.keys(result.mapping_tag_session).length > 0 ||
          Object.keys(result.transcripts).length > 0 ||
          Object.keys(result.enhanced_notes).length > 0;

        if (!hasChanges) {
          return undefined;
        }

        return asTablesChanges({
          sessions: result.sessions,
          mapping_session_participant: result.mapping_session_participant,
          tags: result.tags,
          mapping_tag_session: result.mapping_tag_session,
          transcripts: result.transcripts,
          enhanced_notes: result.enhanced_notes,
        }) as unknown as PersistedChanges<
          Schemas,
          Persists.StoreOrMergeableStore
        >;
      } catch (error) {
        console.error(
          `[SessionPersister] loadSingle error for ${sessionId}:`,
          error,
        );
        return undefined;
      }
    },
    collect: (store, tables, dataDir, changedTables) => {
      let changedSessionIds: Set<string> | undefined;

      if (changedTables) {
        const changeResult = getChangedSessionIds(tables, changedTables);
        if (!changeResult) {
          const allNoteIds = new Set(
            Object.keys(store.getTable("enhanced_notes") ?? {}),
          );
          const sessionsWithMemo = new Set(
            Object.entries(store.getTable("sessions") ?? {})
              .filter(([, s]) => s.raw_md)
              .map(([id]) => id),
          );
          return {
            operations: [],
            validSessionIds: new Set(
              Object.keys(store.getTable("sessions") ?? {}),
            ),
            validNoteIds: allNoteIds,
            sessionsWithMemo,
          };
        }

        if (changeResult.hasUnresolvedDeletions) {
          changedSessionIds = undefined;
        } else {
          changedSessionIds = changeResult.changedSessionIds;
        }
      }

      const sessionResult = collectSessionWriteOps(
        store,
        tables,
        dataDir,
        changedSessionIds,
      ) as SessionCollectorResult;
      const transcriptResult = collectTranscriptWriteOps(
        store,
        tables,
        dataDir,
        changedSessionIds,
      );
      const noteResult = collectNoteWriteOps(
        store,
        tables,
        dataDir,
        changedSessionIds,
      ) as NoteCollectorResult;

      const operations = [
        ...sessionResult.operations,
        ...transcriptResult.operations,
        ...noteResult.operations,
      ];

      return {
        operations,
        validSessionIds: sessionResult.validSessionIds,
        validNoteIds: noteResult.validNoteIds,
        sessionsWithMemo: noteResult.sessionsWithMemo,
      };
    },
    load: async () => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllSessionData(dataDir);

        const result = deletionMarker.markAll(data);

        const hasChanges =
          Object.keys(result.sessions).length > 0 ||
          Object.keys(result.mapping_session_participant).length > 0 ||
          Object.keys(result.tags).length > 0 ||
          Object.keys(result.mapping_tag_session).length > 0 ||
          Object.keys(result.transcripts).length > 0 ||
          Object.keys(result.enhanced_notes).length > 0;

        if (!hasChanges) {
          return undefined;
        }

        return asTablesChanges({
          sessions: result.sessions,
          mapping_session_participant: result.mapping_session_participant,
          tags: result.tags,
          mapping_tag_session: result.mapping_tag_session,
          transcripts: result.transcripts,
          enhanced_notes: result.enhanced_notes,
        }) as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[SessionPersister] load error:", error);
        return undefined;
      }
    },
    postSave: async (_dataDir, result) => {
      const { validSessionIds, validNoteIds, sessionsWithMemo } =
        result as CollectorResult & {
          validSessionIds: Set<string>;
          validNoteIds: Set<string>;
          sessionsWithMemo: Set<string>;
        };
      if (validSessionIds.size === 0) {
        return;
      }
      await fsSyncCommands.cleanupOrphan(
        { type: "dirs", subdir: "sessions", marker_file: "_meta.json" },
        Array.from(validSessionIds),
      );
      await fsSyncCommands.cleanupOrphan(
        {
          type: "sessionNotes",
          sessions_with_memo: Array.from(sessionsWithMemo),
        },
        Array.from(validNoteIds),
      );
    },
  });
}
