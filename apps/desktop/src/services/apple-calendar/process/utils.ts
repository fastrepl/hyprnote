import type { Store } from "../../../store/tinybase/store/main";

export function isSessionEmpty(store: Store, sessionId: string): boolean {
  const session = store.getRow("sessions", sessionId);
  if (!session) {
    return true;
  }

  if (session.raw_md && String(session.raw_md).trim()) {
    return false;
  }

  if (session.enhanced_md && String(session.enhanced_md).trim()) {
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
