import { type ChangedTables, type TablesContent } from "../shared";

export function parseSessionIdFromPath(path: string): string | null {
  const parts = path.split("/");
  const sessionsIndex = parts.indexOf("sessions");
  if (sessionsIndex === -1 || sessionsIndex + 1 >= parts.length) {
    return null;
  }
  return parts[sessionsIndex + 1] || null;
}

export type ChangeResult = {
  changedSessionIds: Set<string>;
  hasUnresolvedDeletions: boolean;
};

export function getChangedSessionIds(
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
