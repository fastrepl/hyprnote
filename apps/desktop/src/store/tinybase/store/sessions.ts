import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { json2md } from "@hypr/tiptap/shared";

import { DEFAULT_USER_ID } from "../../../utils";
import { id } from "../../../utils";
import * as main from "./main";

type Store = NonNullable<ReturnType<typeof main.UI.useStore>>;

export function createSession(store: Store, title?: string): string {
  const sessionId = id();
  store.setRow("sessions", sessionId, {
    title: title ?? "",
    created_at: new Date().toISOString(),
    raw_md: "",
    user_id: DEFAULT_USER_ID,
  });
  void analyticsCommands.event({
    event: "note_created",
    has_event_id: false,
  });
  return sessionId;
}

export function getOrCreateSessionForEventId(
  store: Store,
  eventId: string,
  title?: string,
): string {
  const sessions = store.getTable("sessions");
  let existingSessionId: string | null = null;

  Object.entries(sessions).forEach(([sessionId, session]) => {
    if (session.event_id === eventId) {
      existingSessionId = sessionId;
    }
  });

  if (existingSessionId) {
    return existingSessionId;
  }

  const sessionId = id();
  store.setRow("sessions", sessionId, {
    event_id: eventId,
    title: title ?? "",
    created_at: new Date().toISOString(),
    raw_md: "",
    user_id: DEFAULT_USER_ID,
  });
  void analyticsCommands.event({
    event: "note_created",
    has_event_id: true,
  });
  return sessionId;
}

export function isSessionEmpty(store: Store, sessionId: string): boolean {
  const session = store.getRow("sessions", sessionId);
  if (!session) {
    return true;
  }

  // event sessions automatically have a title
  // only consider titles if it does not have an event
  if (session.title && session.title.trim() && !session.event_id) {
    return false;
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
