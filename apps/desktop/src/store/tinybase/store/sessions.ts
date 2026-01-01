import { commands as analyticsCommands } from "@hypr/plugin-analytics";

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
    enhanced_md: "",
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
    enhanced_md: "",
    user_id: DEFAULT_USER_ID,
  });
  void analyticsCommands.event({
    event: "note_created",
    has_event_id: true,
  });
  return sessionId;
}
