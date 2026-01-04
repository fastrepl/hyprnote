import { sep } from "@tauri-apps/api/path";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type {
  MappingSessionParticipantStorage,
  MappingTagSession,
  SessionStorage,
  Tag,
} from "@hypr/store";

import {
  type CollectorResult,
  getSessionDir,
  type TablesContent,
} from "../utils";

type ParticipantData = MappingSessionParticipantStorage & { id: string };

export type SessionMetaJson = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  event_id?: string;
  participants: ParticipantData[];
  tags?: string[];
};

type SessionMetaWithFolder = {
  meta: SessionMetaJson;
  folderPath: string;
};

export function collectSessionMeta<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
): Map<string, SessionMetaWithFolder> {
  const result = new Map<string, SessionMetaWithFolder>();

  const sessions = (store.getTable("sessions") ?? {}) as Record<
    string,
    SessionStorage
  >;
  const participants = (store.getTable("mapping_session_participant") ??
    {}) as Record<string, MappingSessionParticipantStorage>;
  const tags = (store.getTable("tags") ?? {}) as Record<string, Tag>;
  const tagMappings = (store.getTable("mapping_tag_session") ?? {}) as Record<
    string,
    MappingTagSession
  >;

  const participantsBySession = new Map<string, ParticipantData[]>();
  for (const [id, participant] of Object.entries(participants)) {
    const sessionId = participant.session_id;
    if (!sessionId) continue;

    const list = participantsBySession.get(sessionId) ?? [];
    list.push({ ...participant, id });
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

export type SessionCollectorResult = CollectorResult & {
  validSessionIds: Set<string>;
};

export function collectSessionWriteOps<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  _tables: TablesContent,
  dataDir: string,
): SessionCollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];

  const sessionMetas = collectSessionMeta(store);

  for (const [sessionId, { meta, folderPath }] of sessionMetas) {
    const sessionDir = getSessionDir(dataDir, sessionId, folderPath);
    dirs.add(sessionDir);

    operations.push({
      type: "json",
      path: [sessionDir, "_meta.json"].join(sep()),
      content: meta,
    });
  }

  return { dirs, operations, validSessionIds: new Set(sessionMetas.keys()) };
}
