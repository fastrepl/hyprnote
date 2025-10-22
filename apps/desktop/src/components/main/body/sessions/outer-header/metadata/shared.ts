import * as persisted from "../../../../../../store/tinybase/persisted";

type MeetingMetadata = {
  tood: string;
  meeting_link?: string | null;
  title: string;
  started_at: string;
  ended_at: string;
};

export function useMeetingMetadata(sessionId: string): MeetingMetadata | null {
  const note = persisted.UI.useCell("sessions", sessionId, "raw_md", persisted.STORE_ID);

  return {
    tood: note ?? "",
    meeting_link: "TOO",
    title: "Event Title",
    started_at: "2025-01-01",
    ended_at: "2025-01-01",
  };
}
