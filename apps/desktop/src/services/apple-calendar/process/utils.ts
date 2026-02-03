import { json2md } from "@hypr/tiptap/shared";

import type { Store } from "../../../store/tinybase/store/main";

export function isSessionEmpty(store: Store, sessionId: string): boolean {
  const session = store.getRow("sessions", sessionId);
  if (!session) {
    return true;
  }

  if (session.raw_md) {
    let raw_md: string;
    try {
      raw_md = json2md(JSON.parse(session.raw_md));
    } catch {
      raw_md = session.raw_md;
    }
    if (raw_md.trim()) {
      return false;
    }
  }

  let hasEnhancedNotes = false;
  store.forEachRow("enhanced_notes", (rowId, _forEachCell) => {
    const note = store.getRow("enhanced_notes", rowId);
    if (note?.session_id === sessionId) {
      const content = note.content;
      if (typeof content === "string" && content.trim()) {
        hasEnhancedNotes = true;
      }
    }
  });

  if (hasEnhancedNotes) {
    return false;
  }

  let hasTranscript = false;
  store.forEachRow("transcripts", (rowId, _forEachCell) => {
    const transcript = store.getRow("transcripts", rowId);
    if (transcript?.session_id === sessionId) {
      hasTranscript = true;
    }
  });

  return !hasTranscript;
}

export function getSessionForEvent(
  store: Store,
  eventId: string,
): string | undefined {
  let foundSessionId: string | undefined;

  store.forEachRow("sessions", (rowId, _forEachCell) => {
    if (foundSessionId) return;

    const session = store.getRow("sessions", rowId);
    if (session?.event_id === eventId) {
      foundSessionId = rowId;
    }
  });

  return foundSessionId;
}
