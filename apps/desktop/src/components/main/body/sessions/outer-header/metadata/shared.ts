import * as persisted from "../../../../../../store/tinybase/persisted";

type MeetingMetadata = {
  tood: string;
  meeting_link?: string | null;
  title: string;
  started_at: string;
  ended_at: string;
};

export function useMeetingMetadata(sessionId: string): MeetingMetadata | null {
  const eventId = persisted.UI.useCell("sessions", sessionId, "event_id", persisted.STORE_ID);

  const eventNote = persisted.UI.useCell("events", eventId ?? "", "note", persisted.STORE_ID);
  const meetingLink = persisted.UI.useCell("events", eventId ?? "", "meeting_link", persisted.STORE_ID);
  const title = persisted.UI.useCell("events", eventId ?? "", "title", persisted.STORE_ID);
  const startedAt = persisted.UI.useCell("events", eventId ?? "", "started_at", persisted.STORE_ID);
  const endedAt = persisted.UI.useCell("events", eventId ?? "", "ended_at", persisted.STORE_ID);

  if (!eventId || !title || !startedAt || !endedAt) {
    return null;
  }

  return {
    tood: eventNote ?? "",
    meeting_link: meetingLink,
    title,
    started_at: startedAt,
    ended_at: endedAt,
  };
}
