import { sep } from "@tauri-apps/api/path";
import {
  exists,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
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
  isUUID,
  type PersisterMode,
} from "./utils";

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

type LoadedData = {
  sessions: Record<string, SessionStorage>;
  mapping_session_participant: Record<string, MappingSessionParticipantStorage>;
  tags: Record<string, Tag>;
  mapping_tag_session: Record<string, MappingTagSession>;
};

async function loadSessionMetaRecursively(
  sessionsDir: string,
  currentPath: string,
  result: LoadedData,
  now: string,
): Promise<void> {
  const s = sep();
  const fullPath = currentPath
    ? [sessionsDir, currentPath].join(s)
    : sessionsDir;

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(fullPath);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory) continue;

    const entryPath = currentPath
      ? [currentPath, entry.name].join(s)
      : entry.name;
    const metaPath = [sessionsDir, entryPath, "_meta.json"].join(s);
    const hasMetaJson = await exists(metaPath);

    if (hasMetaJson) {
      try {
        const content = await readTextFile(metaPath);
        const meta = JSON.parse(content) as SessionMetaJson;
        const sessionId = entry.name;
        const folderPath = currentPath ? currentPath.split(s).join("/") : "";

        result.sessions[sessionId] = {
          user_id: meta.user_id,
          created_at: meta.created_at,
          title: meta.title,
          folder_id: folderPath,
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
    } else {
      await loadSessionMetaRecursively(sessionsDir, entryPath, result, now);
    }
  }
}

async function loadAllSessionMeta(dataDir: string): Promise<LoadedData> {
  const result: LoadedData = {
    sessions: {},
    mapping_session_participant: {},
    tags: {},
    mapping_tag_session: {},
  };

  const sessionsDir = [dataDir, "sessions"].join(sep());
  const now = new Date().toISOString();

  await loadSessionMetaRecursively(sessionsDir, "", result, now);

  return result;
}

async function collectSessionDirsRecursively(
  sessionsDir: string,
  currentPath: string,
  result: Array<{ path: string; name: string }>,
): Promise<void> {
  const s = sep();
  const fullPath = currentPath
    ? [sessionsDir, currentPath].join(s)
    : sessionsDir;

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(fullPath);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory) continue;

    const entryPath = currentPath
      ? [currentPath, entry.name].join(s)
      : entry.name;
    const metaPath = [sessionsDir, entryPath, "_meta.json"].join(s);
    const hasMetaJson = await exists(metaPath);

    if (hasMetaJson) {
      result.push({ path: [sessionsDir, entryPath].join(s), name: entry.name });
    } else {
      await collectSessionDirsRecursively(sessionsDir, entryPath, result);
    }
  }
}

async function cleanupOrphanSessionDirs(
  dataDir: string,
  validSessionIds: Set<string>,
): Promise<void> {
  const sessionsDir = [dataDir, "sessions"].join(sep());
  const existingDirs: Array<{ path: string; name: string }> = [];

  try {
    await collectSessionDirsRecursively(sessionsDir, "", existingDirs);
  } catch {
    return;
  }

  for (const dir of existingDirs) {
    if (isUUID(dir.name) && !validSessionIds.has(dir.name)) {
      try {
        await remove(dir.path, { recursive: true });
      } catch (e) {
        console.error(
          `[SessionPersister] Failed to remove orphan dir ${dir.path}:`,
          e,
        );
      }
    }
  }
}

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

            const dirs = new Set<string>();
            const writeOperations: Array<{ path: string; content: string }> =
              [];

            for (const [sessionId, { meta, folderPath }] of sessionMetas) {
              const sessionDir = getSessionDir(dataDir, sessionId, folderPath);
              dirs.add(sessionDir);

              writeOperations.push({
                path: [sessionDir, "_meta.json"].join(sep()),
                content: JSON.stringify(meta, null, 2),
              });
            }

            if (writeOperations.length > 0) {
              await ensureDirsExist(dirs);

              for (const op of writeOperations) {
                await writeTextFile(op.path, op.content);
              }
            }

            await cleanupOrphanSessionDirs(
              dataDir,
              new Set(sessionMetas.keys()),
            );
          } catch (error) {
            console.error("[SessionPersister] save error:", error);
          }
        };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    () => null,
    () => {},
    (error) => console.error("[SessionPersister]:", error),
    StoreOrMergeableStore,
  );
}
