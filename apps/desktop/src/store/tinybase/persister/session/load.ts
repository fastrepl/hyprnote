import { sep } from "@tauri-apps/api/path";
import { exists, readDir, readTextFile, remove } from "@tauri-apps/plugin-fs";

import type {
  MappingSessionParticipantStorage,
  MappingTagSession,
  SessionStorage,
  Tag,
} from "@hypr/store";

import { isUUID } from "../utils";
import type { SessionMetaJson } from "./collect";

export type LoadedData = {
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

export async function loadAllSessionMeta(dataDir: string): Promise<LoadedData> {
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

export async function cleanupOrphanSessionDirs(
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
