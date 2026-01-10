import type { TablesContent } from "../../shared";

type SessionTables =
  | "sessions"
  | "mapping_session_participant"
  | "tags"
  | "mapping_tag_session"
  | "transcripts"
  | "enhanced_notes";

export type LoadedSessionData = Pick<Required<TablesContent>, SessionTables>;

export function createEmptyLoadedSessionData(): LoadedSessionData {
  return {
    sessions: {},
    mapping_session_participant: {},
    tags: {},
    mapping_tag_session: {},
    transcripts: {},
    enhanced_notes: {},
  };
}
