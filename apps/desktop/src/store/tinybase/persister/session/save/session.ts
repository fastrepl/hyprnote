import { sep } from "@tauri-apps/api/path";

import type { Store } from "../../../store/main";
import { buildSessionPath, type WriteOperation } from "../../shared";
import type { ParticipantData, SessionMetaJson } from "../types";

type SessionMetaWithFolder = {
  meta: SessionMetaJson;
  folderPath: string;
};

export function tablesToSessionMetaMap(
  store: Store,
): Map<string, SessionMetaWithFolder> {
  const result = new Map<string, SessionMetaWithFolder>();

  const sessions = store.getTable("sessions") ?? {};
  const participants = store.getTable("mapping_session_participant") ?? {};
  const tags = store.getTable("tags") ?? {};
  const tagMappings = store.getTable("mapping_tag_session") ?? {};

  const participantsBySession = new Map<string, ParticipantData[]>();
  for (const [id, participant] of Object.entries(participants)) {
    const sessionId = participant.session_id;
    if (!sessionId) continue;

    const list = participantsBySession.get(sessionId) ?? [];
    list.push({
      id,
      user_id: participant.user_id,
      created_at: participant.created_at,
      session_id: participant.session_id,
      human_id: participant.human_id,
      source: participant.source,
    });
    participantsBySession.set(sessionId, list);
  }

  const tagsBySession = new Map<string, string[]>();
  for (const mapping of Object.values(tagMappings)) {
    const sessionId = mapping.session_id;
    const tagId = mapping.tag_id;
    if (!sessionId || !tagId) continue;

    const tag = tags[tagId];
    if (!tag?.name) continue;

    const list = tagsBySession.get(sessionId) ?? [];
    list.push(tag.name);
    tagsBySession.set(sessionId, list);
  }

  for (const [sessionId, session] of Object.entries(sessions)) {
    const sessionTags = tagsBySession.get(sessionId);
    result.set(sessionId, {
      meta: {
        id: sessionId,
        user_id: session.user_id ?? "",
        created_at: session.created_at ?? "",
        title: session.title ?? "",
        event_id: session.event_id || undefined,
        participants: participantsBySession.get(sessionId) ?? [],
        tags: sessionTags && sessionTags.length > 0 ? sessionTags : undefined,
      },
      folderPath: session.folder_id ?? "",
    });
  }

  return result;
}

export function buildSessionSaveOps(
  store: Store,
  _tables: unknown,
  dataDir: string,
  changedSessionIds?: Set<string>,
): WriteOperation[] {
  const operations: WriteOperation[] = [];

  const sessionMetas = tablesToSessionMetaMap(store);

  const sessionsToProcess = changedSessionIds
    ? new Map([...sessionMetas].filter(([id]) => changedSessionIds.has(id)))
    : sessionMetas;

  for (const [sessionId, { meta, folderPath }] of sessionsToProcess) {
    const sessionDir = buildSessionPath(dataDir, sessionId, folderPath);

    operations.push({
      type: "json",
      path: [sessionDir, "_meta.json"].join(sep()),
      content: meta,
    });
  }

  return operations;
}
