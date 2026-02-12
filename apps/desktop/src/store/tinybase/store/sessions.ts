import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import type { Event, SessionEvent } from "@hypr/store";
import { json2md } from "@hypr/tiptap/shared";
import { formatDate } from "@hypr/utils";

import { DEFAULT_USER_ID } from "../../../utils";
import { id } from "../../../utils";
import { getSessionEvent } from "../../../utils/session-event";
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

// EWW!!!

function getKey(event: Event): string {
  const startedAt = event.started_at ? new Date(event.started_at) : null;
  if (event.has_recurrence_rules) {
    const day = startedAt ? formatDate(startedAt, "yyyy-MM-dd") : "1970-01-01";
    return `${event.tracking_id_event}:${day}`;
  }
  return event.tracking_id_event;
}

function getSessionEventKey(event: SessionEvent): string {
  const startedAt = event.started_at ? new Date(event.started_at) : null;
  if (event.has_recurrence_rules) {
    const day = startedAt ? formatDate(startedAt, "yyyy-MM-dd") : "1970-01-01";
    return `${event.tracking_id}:${day}`;
  }
  return event.tracking_id;
}

export function getOrCreateSessionForEventId(
  store: Store,
  eventId: string,
  title?: string,
): string {
  let existingSessionId: string | null = null;
  let hasEvent = store.hasRow("events", eventId);
  if (!hasEvent) {
    console.trace(
      `[getOrCreateSessionForEventId] event that corresponds to the provided eventId ${eventId} does not exist`,
    );
    return createSession(store, title);
  }
  const event = store.getRow("events", eventId) as Event;
  const eventKey = getKey(event); // TODO

  store.forEachRow("sessions", (rowId, _forEachCell) => {
    if (existingSessionId) return;
    const session = store.getRow("sessions", rowId);
    const sessionEvent = getSessionEvent(session);
    if (!sessionEvent) return;
    const sessionKey = getSessionEventKey(sessionEvent);
    if (sessionKey === eventKey) {
      existingSessionId = rowId;
    }
  });

  if (existingSessionId) {
    return existingSessionId;
  }

  let sessionEvent: SessionEvent = {
    tracking_id: event.tracking_id_event,
    calendar_id: event.calendar_id,
    title: event.title,
    started_at: event.started_at,
    ended_at: event.ended_at,
    // TODO: fix this
    is_all_day: !!event.is_all_day,
    has_recurrence_rules: !!event.has_recurrence_rules,
    location: event.location,
    meeting_link: event.meeting_link,
    description: event.description,
    recurrence_series_id: event.recurrence_series_id,
  };

  const sessionId = id();
  store.setRow("sessions", sessionId, {
    eventJson: JSON.stringify(sessionEvent),
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
  if (session.title && session.title.trim() && !session.eventJson) {
    return false;
  }

  if (session.raw_md) {
    let raw_md: string;
    try {
      raw_md = json2md(JSON.parse(session.raw_md));
    } catch {
      raw_md = session.raw_md;
    }
    raw_md = raw_md.trim();
    // see: https://github.com/ueberdosis/tiptap/issues/7495
    // this is a known regression on @tiptap/markdown on v3.18.0.
    if (raw_md && raw_md !== "&nbsp;") {
      return false;
    }
  }

  let hasTranscript = false;
  store.forEachRow("transcripts", (rowId, _forEachCell) => {
    const row = store.getRow("transcripts", rowId);
    if (row?.session_id === sessionId) {
      hasTranscript = true;
    }
  });
  if (hasTranscript) {
    return false;
  }

  let hasEnhancedNote = false;
  store.forEachRow("enhanced_notes", (rowId, _forEachCell) => {
    const row = store.getRow("enhanced_notes", rowId);
    if (row?.session_id === sessionId) {
      hasEnhancedNote = true;
    }
  });
  if (hasEnhancedNote) {
    return false;
  }

  let hasParticipant = false;
  store.forEachRow("mapping_session_participant", (rowId, _forEachCell) => {
    const row = store.getRow("mapping_session_participant", rowId);
    if (row?.session_id === sessionId) {
      hasParticipant = true;
    }
  });
  if (hasParticipant) {
    return false;
  }

  let hasTag = false;
  store.forEachRow("mapping_tag_session", (rowId, _forEachCell) => {
    const row = store.getRow("mapping_tag_session", rowId);
    if (row?.session_id === sessionId) {
      hasTag = true;
    }
  });
  if (hasTag) {
    return false;
  }

  return true;
}
