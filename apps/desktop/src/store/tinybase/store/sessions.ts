import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { fetchEventParticipants } from "../../../services/apple-calendar/fetch";
import { syncParticipantsForSession } from "../../../services/apple-calendar/process";
import { DEFAULT_USER_ID } from "../../../utils";
import { id } from "../../../utils";
import * as main from "./main";

type Store = NonNullable<ReturnType<typeof main.UI.useStore>>;
type MergeableStore = main.Store;

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

  void syncEventParticipantsToSession(store, eventId, sessionId);

  return sessionId;
}

async function syncEventParticipantsToSession(
  store: Store,
  eventId: string,
  sessionId: string,
): Promise<void> {
  const event = store.getRow("events", eventId);
  if (!event) {
    return;
  }

  const trackingIdEvent = event.tracking_id_event as string | undefined;
  const calendarId = event.calendar_id as string | undefined;
  const startedAt = event.started_at as string | undefined;

  if (!trackingIdEvent || !calendarId || !startedAt) {
    return;
  }

  const calendar = store.getRow("calendars", calendarId);
  if (!calendar) {
    return;
  }

  const trackingIdCalendar = calendar.tracking_id_calendar as
    | string
    | undefined;
  if (!trackingIdCalendar) {
    return;
  }

  const participants = await fetchEventParticipants(
    trackingIdCalendar,
    trackingIdEvent,
    startedAt,
  );

  if (participants.length > 0) {
    syncParticipantsForSession(
      store as MergeableStore,
      sessionId,
      participants,
    );
  }
}
