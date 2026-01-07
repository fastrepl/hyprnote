import { sep } from "@tauri-apps/api/path";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import type {
  EnhancedNoteStorage,
  MappingSessionParticipantStorage,
  MappingTagSession,
  SessionStorage,
  Tag,
  TranscriptStorage,
} from "@hypr/store";

import type {
  NoteFrontmatter,
  SessionMetaJson,
  TranscriptJson,
} from "./transform";

export type SessionDataLoad = {
  sessions: Record<string, SessionStorage>;
  mapping_session_participant: Record<string, MappingSessionParticipantStorage>;
  tags: Record<string, Tag>;
  mapping_tag_session: Record<string, MappingTagSession>;
  transcripts: Record<string, TranscriptStorage>;
  enhanced_notes: Record<string, EnhancedNoteStorage>;
};

const LABEL = "SessionPersister";

function extractSessionIdAndFolder(path: string): {
  sessionId: string;
  folderPath: string;
} {
  const parts = path.split("/");
  const sessionId = parts[parts.length - 2] || "";
  const folderPath = parts.slice(0, -2).join("/");
  return { sessionId, folderPath };
}

function processMetaFile(
  path: string,
  content: string,
  result: SessionDataLoad,
  now: string,
): void {
  const { sessionId, folderPath } = extractSessionIdAndFolder(path);
  if (!sessionId) return;

  try {
    const meta = JSON.parse(content) as SessionMetaJson;

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
    console.error(`[${LABEL}] Failed to parse meta from ${path}:`, error);
  }
}

function processTranscriptFile(
  path: string,
  content: string,
  result: SessionDataLoad,
): void {
  try {
    const data = JSON.parse(content) as TranscriptJson;

    for (const transcript of data.transcripts) {
      const { id, words, speaker_hints, ...transcriptData } = transcript;
      result.transcripts[id] = {
        ...transcriptData,
        words: JSON.stringify(words),
        speaker_hints: JSON.stringify(speaker_hints),
      };
    }
  } catch (error) {
    console.error(`[${LABEL}] Failed to load transcript from ${path}:`, error);
  }
}

async function processMdFile(
  path: string,
  content: string,
  result: SessionDataLoad,
): Promise<void> {
  try {
    const parseResult = await fsSyncCommands.deserialize(content);

    if (parseResult.status === "error") {
      console.error(
        `[${LABEL}] Failed to parse frontmatter from ${path}:`,
        parseResult.error,
      );
      return;
    }

    const { frontmatter, content: markdownBody } = parseResult.data;
    const fm = frontmatter as NoteFrontmatter;

    if (!fm.id || !fm.session_id || !fm.type) {
      return;
    }

    const tiptapResult = await fsSyncCommands.parseMdToTiptap(markdownBody);
    if (tiptapResult.status === "error") {
      console.error(
        `[${LABEL}] Failed to parse markdown from ${path}:`,
        tiptapResult.error,
      );
      return;
    }

    const tiptapContent = JSON.stringify(tiptapResult.data);

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
    console.error(`[${LABEL}] Failed to load note from ${path}:`, error);
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
    enhanced_notes: {},
  };

  const sessionsDir = [dataDir, "sessions"].join(sep());
  const now = new Date().toISOString();

  const scanResult = await fsSyncCommands.scanAndRead(
    sessionsDir,
    ["_meta.json", "_transcript.json", "*.md"],
    true,
  );

  if (scanResult.status === "error") {
    console.error(`[${LABEL}] scan error:`, scanResult.error);
    return result;
  }

  const { files } = scanResult.data;

  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith("_meta.json")) {
      processMetaFile(path, content, result, now);
    }
  }

  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith("_transcript.json")) {
      processTranscriptFile(path, content, result);
    }
  }

  const mdPromises: Promise<void>[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith(".md")) {
      mdPromises.push(processMdFile(path, content, result));
    }
  }
  await Promise.all(mdPromises);

  return result;
}
