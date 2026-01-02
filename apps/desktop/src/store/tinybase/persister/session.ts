import { readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import type {
  MappingSessionParticipantStorage,
  MappingTagSession,
  SessionStorage,
  Tag,
} from "@hypr/store";

import { StoreOrMergeableStore } from "../store/shared";
import {
  ensureDirsExist,
  getDataDir,
  getSessionDir,
  type PersisterMode,
} from "./utils";

type ParticipantData = MappingSessionParticipantStorage & { id: string };

export type SessionMetaJson = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  folder_id?: string;
  event_id?: string;
  participants: ParticipantData[];
  tags?: string[];
};

type LoadedData = {
  sessions: Record<string, SessionStorage>;
  mapping_session_participant: Record<string, MappingSessionParticipantStorage>;
  tags: Record<string, Tag>;
  mapping_tag_session: Record<string, MappingTagSession>;
};

async function loadAllSessionMeta(dataDir: string): Promise<LoadedData> {
  const result: LoadedData = {
    sessions: {},
    mapping_session_participant: {},
    tags: {},
    mapping_tag_session: {},
  };

  const sessionsDir = `${dataDir}/sessions`;

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(sessionsDir);
  } catch {
    return result;
  }

  const now = new Date().toISOString();

  for (const entry of entries) {
    if (!entry.isDirectory) continue;

    const sessionId = entry.name;
    const metaPath = `${sessionsDir}/${sessionId}/_meta.json`;

    try {
      const content = await readTextFile(metaPath);
      const meta = JSON.parse(content) as SessionMetaJson;

      result.sessions[sessionId] = {
        user_id: meta.user_id,
        created_at: meta.created_at,
        title: meta.title,
        folder_id: meta.folder_id,
        event_id: meta.event_id,
        raw_md: "",
        enhanced_md: "",
      };

      for (const participant of meta.participants) {
        result.mapping_session_participant[participant.id] = {
          user_id: participant.user_id,
          created_at: participant.created_at,
          session_id: sessionId,
          human_id: participant.human_id,
          source: participant.source,
        };
      }

      if (meta.tags) {
        for (const tagName of meta.tags) {
          if (!result.tags[tagName]) {
            result.tags[tagName] = {
              user_id: meta.user_id,
              created_at: now,
              name: tagName,
            };
          }

          const mappingId = `${sessionId}:${tagName}`;
          result.mapping_tag_session[mappingId] = {
            user_id: meta.user_id,
            created_at: now,
            tag_id: tagName,
            session_id: sessionId,
          };
        }
      }
    } catch {
      continue;
    }
  }

  return result;
}

export function collectSessionMeta<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
): Map<string, SessionMetaJson> {
  const result = new Map<string, SessionMetaJson>();

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
      id: sessionId,
      user_id: session.user_id ?? "",
      created_at: session.created_at ?? "",
      title: session.title ?? "",
      folder_id: session.folder_id || undefined,
      event_id: session.event_id || undefined,
      participants: participantsBySession.get(sessionId) ?? [],
      tags: sessionTags && sessionTags.length > 0 ? sessionTags : undefined,
    });
  }

  return result;
}

export function createSessionPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  const loadFn =
    config.mode === "save-only"
      ? async (): Promise<Content<Schemas> | undefined> => undefined
      : async (): Promise<Content<Schemas> | undefined> => {
          try {
            const dataDir = await getDataDir();
            const data = await loadAllSessionMeta(dataDir);
            return [
              {
                sessions: data.sessions,
                mapping_session_participant: data.mapping_session_participant,
                tags: data.tags,
                mapping_tag_session: data.mapping_tag_session,
              },
              {},
            ] as unknown as Content<Schemas>;
          } catch (error) {
            console.error("[SessionPersister] load error:", error);
            return undefined;
          }
        };

  const saveFn =
    config.mode === "load-only"
      ? async () => {}
      : async () => {
          try {
            const dataDir = await getDataDir();
            const sessionMetas = collectSessionMeta(store);

            if (sessionMetas.size === 0) {
              return;
            }

            const dirs = new Set<string>();
            const writeOperations: Array<{ path: string; content: string }> =
              [];

            for (const [sessionId, meta] of sessionMetas) {
              const sessionDir = getSessionDir(dataDir, sessionId);
              dirs.add(sessionDir);

              writeOperations.push({
                path: `${sessionDir}/_meta.json`,
                content: JSON.stringify(meta, null, 2),
              });
            }

            await ensureDirsExist(dirs);

            for (const op of writeOperations) {
              await writeTextFile(op.path, op.content);
            }
          } catch (error) {
            console.error("[SessionPersister] save error:", error);
          }
        };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    (listener) => setInterval(listener, 1000),
    (handle) => clearInterval(handle),
    (error) => console.error("[SessionPersister]:", error),
    StoreOrMergeableStore,
  );
}
