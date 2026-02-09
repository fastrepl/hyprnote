import type { SessionEvent } from "@hypr/store";

type SessionLike = { event?: string | null };

type StoreLike = {
  getRow(
    tableName: "sessions",
    rowId: string,
  ): Record<string, unknown> | undefined;
};

export function getSessionEvent(session: SessionLike): SessionEvent | null {
  const eventJson = session.event;
  if (!eventJson) return null;
  try {
    return JSON.parse(eventJson) as SessionEvent;
  } catch {
    return null;
  }
}

export function getSessionEventById(
  store: StoreLike,
  sessionId: string,
): SessionEvent | null {
  const row = store.getRow("sessions", sessionId);
  if (!row) return null;
  return getSessionEvent(row as SessionLike);
}

export function buildSessionEventJson(event: SessionEvent): string {
  return JSON.stringify(event);
}
