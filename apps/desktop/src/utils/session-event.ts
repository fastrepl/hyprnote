import type { SessionEvent } from "@hypr/store";

export function parseSessionEvent(
  eventJson: string | undefined,
): SessionEvent | null {
  if (!eventJson) return null;
  try {
    return JSON.parse(eventJson) as SessionEvent;
  } catch {
    return null;
  }
}

export function getSessionEventStartedAt(
  eventJson: string | undefined,
): string | null {
  return parseSessionEvent(eventJson)?.started_at ?? null;
}

export function getSessionEventTrackingId(
  eventJson: string | undefined,
): string | null {
  return parseSessionEvent(eventJson)?.tracking_id ?? null;
}

export function getSessionEventCalendarId(
  eventJson: string | undefined,
): string | null {
  return parseSessionEvent(eventJson)?.calendar_id ?? null;
}

export function buildSessionEventJson(event: SessionEvent): string {
  return JSON.stringify(event);
}
