import type { Content } from "tinybase/with-schemas";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCollectorPersister } from "../factories";
import {
  asTablesChanges,
  type ChangedTables,
  type CollectorResult,
  getDataDir,
  type TablesContent,
} from "../shared";
import {
  collectNoteWriteOps,
  collectSessionWriteOps,
  collectTranscriptWriteOps,
  type SessionCollectorResult,
} from "./collect";
import { loadAllSessionData } from "./load";

function getChangedSessionIds(
  tables: TablesContent,
  changedTables: ChangedTables,
): Set<string> | undefined {
  const changedSessionIds = new Set<string>();

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
      }
    }
  }

  const changedTranscripts = changedTables.transcripts;
  if (changedTranscripts) {
    for (const id of Object.keys(changedTranscripts)) {
      const transcript = tables.transcripts?.[id];
      if (transcript?.session_id) {
        changedSessionIds.add(transcript.session_id);
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
      }
    }
  }

  if (changedSessionIds.size === 0) {
    return undefined;
  }

  return changedSessionIds;
}

export function createSessionPersister(store: Store) {
  return createCollectorPersister(store, {
    label: "SessionPersister",
    collect: (store, tables, dataDir, changedTables) => {
      let changedSessionIds: Set<string> | undefined;

      if (changedTables) {
        changedSessionIds = getChangedSessionIds(tables, changedTables);
        if (!changedSessionIds) {
          return {
            dirs: new Set(),
            operations: [],
            validSessionIds: new Set(),
          };
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
      );

      const dirs = new Set([
        ...sessionResult.dirs,
        ...transcriptResult.dirs,
        ...noteResult.dirs,
      ]);
      const operations = [
        ...sessionResult.operations,
        ...transcriptResult.operations,
        ...noteResult.operations,
      ];

      return {
        dirs,
        operations,
        validSessionIds: changedSessionIds
          ? new Set<string>()
          : sessionResult.validSessionIds,
      };
    },
    load: async () => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllSessionData(dataDir);

        const hasData =
          Object.keys(data.sessions).length > 0 ||
          Object.keys(data.transcripts).length > 0 ||
          Object.keys(data.enhanced_notes).length > 0;

        if (!hasData) {
          return undefined;
        }

        return asTablesChanges({
          sessions: data.sessions,
          mapping_session_participant: data.mapping_session_participant,
          tags: data.tags,
          mapping_tag_session: data.mapping_tag_session,
          transcripts: data.transcripts,
          enhanced_notes: data.enhanced_notes,
        }) as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[SessionPersister] load error:", error);
        return undefined;
      }
    },
    postSave: async (_dataDir, result) => {
      const { validSessionIds } = result as CollectorResult & {
        validSessionIds: Set<string>;
      };
      await fsSyncCommands.cleanupOrphanDirs(
        "sessions",
        "_meta.json",
        Array.from(validSessionIds),
      );
    },
  });
}
