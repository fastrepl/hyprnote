import * as main from "../../../../../../store/tinybase/main";

export type MeetingMetadata = {
  tood: string;
  meeting_link?: string | null;
  title: string;
  started_at: string;
  ended_at: string;
  location?: string | null;
  description?: string | null;
};

export function useMeetingMetadata(sessionId: string): MeetingMetadata | null {
  const eventId = main.UI.useCell("sessions", sessionId, "event_id", main.STORE_ID);

  const eventNote = main.UI.useCell("events", eventId ?? "", "note", main.STORE_ID);
  const meetingLink = main.UI.useCell("events", eventId ?? "", "meeting_link", main.STORE_ID);
  const title = main.UI.useCell("events", eventId ?? "", "title", main.STORE_ID);
  const startedAt = main.UI.useCell("events", eventId ?? "", "started_at", main.STORE_ID);
  const endedAt = main.UI.useCell("events", eventId ?? "", "ended_at", main.STORE_ID);
  const location = main.UI.useCell("events", eventId ?? "", "location", main.STORE_ID);
  const description = main.UI.useCell("events", eventId ?? "", "description", main.STORE_ID);

  if (!eventId || !title || !startedAt || !endedAt) {
    return null;
  }

  return {
    tood: eventNote ?? "",
    meeting_link: meetingLink,
    title,
    started_at: startedAt,
    ended_at: endedAt,
    location: location as string | null | undefined,
    description: description as string | null | undefined,
  };
}
