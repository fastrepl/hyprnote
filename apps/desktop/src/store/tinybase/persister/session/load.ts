import { sep } from "@tauri-apps/api/path";
import { exists, readDir, readTextFile } from "@tauri-apps/plugin-fs";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import type {
  EnhancedNoteStorage,
  MappingSessionParticipantStorage,
  MappingTagSession,
  SessionStorage,
  SpeakerHintStorage,
  Tag,
  TranscriptStorage,
  WordStorage,
} from "@hypr/store";
import { md2json } from "@hypr/tiptap/shared";

import type { NoteFrontmatter } from "../note/collect";
import { isFileNotFoundError } from "../utils";
import type { SessionMetaJson } from "./collect";

type TranscriptWithData = TranscriptStorage & {
  id: string;
  words: Array<WordStorage & { id: string }>;
  speaker_hints: Array<SpeakerHintStorage & { id: string }>;
};

type TranscriptJson = {
  transcripts: TranscriptWithData[];
};

export type SessionDataLoad = {
  sessions: Record<string, SessionStorage>;
  mapping_session_participant: Record<string, MappingSessionParticipantStorage>;
  tags: Record<string, Tag>;
  mapping_tag_session: Record<string, MappingTagSession>;
  transcripts: Record<string, TranscriptStorage>;
  words: Record<string, WordStorage>;
  speaker_hints: Record<string, SpeakerHintStorage>;
  enhanced_notes: Record<string, EnhancedNoteStorage>;
};

const LABEL = "SessionPersister";

async function loadSessionDir(
  sessionsDir: string,
  sessionPath: string,
  sessionId: string,
  result: SessionDataLoad,
  now: string,
): Promise<void> {
  const s = sep();
  const sessionDir = [sessionsDir, sessionPath].join(s);

  const metaPath = [sessionDir, "_meta.json"].join(s);
  const transcriptPath = [sessionDir, "_transcript.json"].join(s);
  const folderPath = sessionPath.includes(s)
    ? sessionPath.slice(0, sessionPath.lastIndexOf(s)).split(s).join("/")
    : "";

  const [metaContent, transcriptExists, entries] = await Promise.all([
    readTextFile(metaPath).catch(() => null),
    exists(transcriptPath),
    readDir(sessionDir).catch(
      () => [] as { name: string; isDirectory: boolean }[],
    ),
  ]);

  if (metaContent) {
    try {
      const meta = JSON.parse(metaContent) as SessionMetaJson;

      result.sessions[sessionId] = {
        user_id: meta.user_id,
        created_at: meta.created_at,
        title: meta.title,
        folder_id: folderPath,
        event_id: meta.event_id,
        raw_md: "",
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
    } catch (error) {
      console.error(`[${LABEL}] Failed to parse meta from ${metaPath}:`, error);
    }
  }

  if (transcriptExists) {
    try {
      const content = await readTextFile(transcriptPath);
      const data = JSON.parse(content) as TranscriptJson;

      for (const transcript of data.transcripts) {
        const { id, words, speaker_hints, ...transcriptData } = transcript;
        result.transcripts[id] = transcriptData;

        for (const word of words) {
          const { id: wordId, ...wordData } = word;
          result.words[wordId] = wordData;
        }

        for (const hint of speaker_hints) {
          const { id: hintId, ...hintData } = hint;
          result.speaker_hints[hintId] = hintData;
        }
      }
    } catch (error) {
      console.error(
        `[${LABEL}] Failed to load transcript from ${transcriptPath}:`,
        error,
      );
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".md")) continue;

    const filePath = [sessionDir, entry.name].join(s);

    try {
      const content = await readTextFile(filePath);
      const parseResult = await fsSyncCommands.deserialize(content);

      if (parseResult.status === "error") {
        console.error(
          `[${LABEL}] Failed to parse frontmatter from ${filePath}:`,
          parseResult.error,
        );
        continue;
      }

      const { frontmatter, content: markdownBody } = parseResult.data;
      const fm = frontmatter as NoteFrontmatter;

      if (!fm.id || !fm.session_id || !fm.type) {
        continue;
      }

      const tiptapJson = md2json(markdownBody);
      const tiptapContent = JSON.stringify(tiptapJson);

      if (fm.type === "memo") {
        if (result.sessions[fm.session_id]) {
          result.sessions[fm.session_id].raw_md = tiptapContent;
        }
      } else if (fm.type === "enhanced_note") {
        result.enhanced_notes[fm.id] = {
          user_id: "",
          created_at: new Date().toISOString(),
          session_id: fm.session_id,
          content: tiptapContent,
          template_id: fm.template_id ?? "",
          position: fm.position ?? 0,
          title: fm.title ?? "",
        };
      }
    } catch (error) {
      console.error(`[${LABEL}] Failed to load note from ${filePath}:`, error);
    }
  }
}

async function loadSessionsRecursively(
  sessionsDir: string,
  currentPath: string,
  result: SessionDataLoad,
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
      await loadSessionDir(sessionsDir, entryPath, entry.name, result, now);
    } else {
      await loadSessionsRecursively(sessionsDir, entryPath, result, now);
    }
  }
}

export async function loadAllSessionData(
  dataDir: string,
): Promise<SessionDataLoad> {
  const result: SessionDataLoad = {
    sessions: {},
    mapping_session_participant: {},
    tags: {},
    mapping_tag_session: {},
    transcripts: {},
    words: {},
    speaker_hints: {},
    enhanced_notes: {},
  };

  const sessionsDir = [dataDir, "sessions"].join(sep());
  const now = new Date().toISOString();

  try {
    await loadSessionsRecursively(sessionsDir, "", result, now);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${LABEL}] load error:`, error);
    }
  }

  return result;
}

