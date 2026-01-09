import { sep } from "@tauri-apps/api/path";

import type { ParsedDocument } from "@hypr/plugin-fs-sync";
import type {
  EnhancedNoteStorage,
  SpeakerHintStorage,
  WordStorage,
} from "@hypr/store";
import { isValidTiptapContent, json2md } from "@hypr/tiptap/shared";

import type { Store } from "../../store/main";
import {
  type CollectorResult,
  getSessionDir,
  iterateTableRows,
  sanitizeFilename,
  type TablesContent,
} from "../shared";
import type {
  NoteFrontmatter,
  ParticipantData,
  SessionMetaJson,
  TranscriptJson,
} from "./transform";

export type { NoteFrontmatter, SessionMetaJson };

type SessionMetaWithFolder = {
  meta: SessionMetaJson;
  folderPath: string;
};

export function collectSessionMeta(
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

export type SessionCollectorResult = CollectorResult & {
  validSessionIds: Set<string>;
};

export function collectSessionWriteOps(
  store: Store,
  _tables: TablesContent,
  dataDir: string,
  changedSessionIds?: Set<string>,
): SessionCollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];

  const sessionMetas = collectSessionMeta(store);

  const sessionsToProcess = changedSessionIds
    ? new Map([...sessionMetas].filter(([id]) => changedSessionIds.has(id)))
    : sessionMetas;

  for (const [sessionId, { meta, folderPath }] of sessionsToProcess) {
    const sessionDir = getSessionDir(dataDir, sessionId, folderPath);
    dirs.add(sessionDir);

    operations.push({
      type: "json",
      path: [sessionDir, "_meta.json"].join(sep()),
      content: meta,
    });
  }

  return {
    dirs,
    operations,
    validSessionIds: changedSessionIds
      ? new Set<string>()
      : new Set(sessionMetas.keys()),
  };
}

export function collectTranscriptWriteOps(
  _store: unknown,
  tables: TablesContent,
  dataDir: string,
  changedSessionIds?: Set<string>,
): CollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];

  const transcripts = iterateTableRows(tables, "transcripts");

  type TranscriptRow = {
    id: string;
    session_id?: string;
    user_id?: string;
    created_at?: string;
    started_at?: number;
    ended_at?: number;
    words?: string;
    speaker_hints?: string;
  };

  const transcriptsBySession = new Map<
    string,
    Array<{
      id: string;
      user_id: string;
      created_at: string;
      session_id: string;
      started_at: number;
      ended_at?: number;
      words: Array<WordStorage & { id: string }>;
      speaker_hints: Array<SpeakerHintStorage & { id: string }>;
    }>
  >();

  for (const transcript of transcripts as TranscriptRow[]) {
    const sessionId = transcript.session_id;
    if (!sessionId) continue;

    const words: Array<WordStorage & { id: string }> = transcript.words
      ? JSON.parse(transcript.words)
      : [];
    const speakerHints: Array<SpeakerHintStorage & { id: string }> =
      transcript.speaker_hints ? JSON.parse(transcript.speaker_hints) : [];

    const transcriptData = {
      id: transcript.id,
      user_id: transcript.user_id ?? "",
      created_at: transcript.created_at ?? "",
      session_id: sessionId,
      started_at: transcript.started_at ?? 0,
      ended_at: transcript.ended_at,
      words,
      speaker_hints: speakerHints,
    };

    const list = transcriptsBySession.get(sessionId) ?? [];
    list.push(transcriptData);
    transcriptsBySession.set(sessionId, list);
  }

  const sessionsToProcess = changedSessionIds
    ? [...transcriptsBySession].filter(([id]) => changedSessionIds.has(id))
    : [...transcriptsBySession];

  for (const [sessionId, sessionTranscripts] of sessionsToProcess) {
    const session = tables.sessions?.[sessionId];
    const folderPath = session?.folder_id ?? "";
    const sessionDir = getSessionDir(dataDir, sessionId, folderPath);
    dirs.add(sessionDir);

    const content: TranscriptJson = { transcripts: sessionTranscripts };
    operations.push({
      type: "json",
      path: [sessionDir, "_transcript.json"].join(sep()),
      content,
    });
  }

  return { dirs, operations };
}

function tryParseAndConvertToMarkdown(content: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Not JSON - treat as raw markdown (e.g., from importer)
    return content.trim() || undefined;
  }

  if (!isValidTiptapContent(parsed)) {
    return undefined;
  }

  return json2md(parsed);
}

function getEnhancedNoteFilename(
  store: Store,
  enhancedNote: EnhancedNoteStorage & { id: string },
): string {
  if (enhancedNote.template_id) {
    const templateTitle = store.getCell(
      "templates",
      enhancedNote.template_id,
      "title",
    );
    const safeName = sanitizeFilename(
      templateTitle || enhancedNote.template_id,
    );
    return `${safeName}.md`;
  }
  return "_summary.md";
}

export function collectNoteWriteOps(
  store: Store,
  tables: TablesContent,
  dataDir: string,
  changedSessionIds?: Set<string>,
): CollectorResult {
  const dirs = new Set<string>();
  const frontmatterBatchItems: Array<[ParsedDocument, string]> = [];

  for (const enhancedNote of iterateTableRows(tables, "enhanced_notes")) {
    if (!enhancedNote.content || !enhancedNote.session_id) {
      continue;
    }

    if (changedSessionIds && !changedSessionIds.has(enhancedNote.session_id)) {
      continue;
    }

    const markdown = tryParseAndConvertToMarkdown(enhancedNote.content);
    if (!markdown) {
      continue;
    }

    const filename = getEnhancedNoteFilename(store, enhancedNote);

    const frontmatter: NoteFrontmatter = {
      id: enhancedNote.id,
      session_id: enhancedNote.session_id,
      type: "enhanced_note",
      template_id: enhancedNote.template_id || undefined,
      position: enhancedNote.position,
      title: enhancedNote.title || undefined,
    };

    const session = tables.sessions?.[enhancedNote.session_id];
    const folderPath = session?.folder_id ?? "";
    const sessionDir = getSessionDir(
      dataDir,
      enhancedNote.session_id,
      folderPath,
    );
    dirs.add(sessionDir);
    frontmatterBatchItems.push([
      { frontmatter, content: markdown },
      [sessionDir, filename].join(sep()),
    ]);
  }

  for (const session of iterateTableRows(tables, "sessions")) {
    if (!session.raw_md) {
      continue;
    }

    if (changedSessionIds && !changedSessionIds.has(session.id)) {
      continue;
    }

    const markdown = tryParseAndConvertToMarkdown(session.raw_md);
    if (!markdown) {
      continue;
    }

    const frontmatter: NoteFrontmatter = {
      id: session.id,
      session_id: session.id,
      type: "memo",
    };

    const folderPath = session.folder_id ?? "";
    const sessionDir = getSessionDir(dataDir, session.id, folderPath);
    dirs.add(sessionDir);
    frontmatterBatchItems.push([
      { frontmatter, content: markdown },
      [sessionDir, "_memo.md"].join(sep()),
    ]);
  }

  const operations: CollectorResult["operations"] = [];
  if (frontmatterBatchItems.length > 0) {
    operations.push({
      type: "document-batch",
      items: frontmatterBatchItems,
    });
  }

  return { dirs, operations };
}
