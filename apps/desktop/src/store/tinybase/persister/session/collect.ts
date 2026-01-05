import { sep } from "@tauri-apps/api/path";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { ParsedDocument } from "@hypr/plugin-fs-sync";
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
import { isValidTiptapContent, json2md } from "@hypr/tiptap/shared";

import {
  type CollectorResult,
  getSessionDir,
  iterateTableRows,
  sanitizeFilename,
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

type TranscriptWithData = TranscriptStorage & {
  id: string;
  words: Array<WordStorage & { id: string }>;
  speaker_hints: Array<SpeakerHintStorage & { id: string }>;
};

type TranscriptJson = {
  transcripts: TranscriptWithData[];
};

export function collectTranscriptWriteOps(
  _store: unknown,
  tables: TablesContent,
  dataDir: string,
): CollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];

  const transcripts = iterateTableRows(tables, "transcripts");
  const words = iterateTableRows(tables, "words");
  const speakerHints = iterateTableRows(tables, "speaker_hints");

  const wordsByTranscript = new Map<
    string,
    Array<WordStorage & { id: string }>
  >();
  for (const word of words) {
    if (!word.transcript_id) continue;
    const list = wordsByTranscript.get(word.transcript_id) ?? [];
    list.push(word);
    wordsByTranscript.set(word.transcript_id, list);
  }

  const hintsByTranscript = new Map<
    string,
    Array<SpeakerHintStorage & { id: string }>
  >();
  for (const hint of speakerHints) {
    if (!hint.transcript_id) continue;
    const list = hintsByTranscript.get(hint.transcript_id) ?? [];
    list.push(hint);
    hintsByTranscript.set(hint.transcript_id, list);
  }

  const transcriptsBySession = new Map<string, TranscriptWithData[]>();
  for (const transcript of transcripts) {
    const sessionId = transcript.session_id;
    if (!sessionId) continue;
    const transcriptData: TranscriptWithData = {
      ...transcript,
      words: wordsByTranscript.get(transcript.id) ?? [],
      speaker_hints: hintsByTranscript.get(transcript.id) ?? [],
    };

    const list = transcriptsBySession.get(sessionId) ?? [];
    list.push(transcriptData);
    transcriptsBySession.set(sessionId, list);
  }

  for (const [sessionId, sessionTranscripts] of transcriptsBySession) {
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

export type NoteFrontmatter = {
  id: string;
  session_id: string;
  type: "enhanced_note" | "memo";
  template_id?: string;
  position?: number;
  title?: string;
};

function tryParseAndConvertToMarkdown(content: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }

  if (!isValidTiptapContent(parsed)) {
    return undefined;
  }

  return json2md(parsed);
}

function getEnhancedNoteFilename<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  enhancedNote: EnhancedNoteStorage & { id: string },
): string {
  if (enhancedNote.template_id) {
    // @ts-ignore
    const templateTitle = store.getCell(
      "templates",
      enhancedNote.template_id,
      "title",
    ) as string | undefined;
    const safeName = sanitizeFilename(
      templateTitle || enhancedNote.template_id,
    );
    return `${safeName}.md`;
  }
  return "_summary.md";
}

export function collectNoteWriteOps<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  tables: TablesContent,
  dataDir: string,
): CollectorResult {
  const dirs = new Set<string>();
  const frontmatterBatchItems: Array<[ParsedDocument, string]> = [];

  for (const enhancedNote of iterateTableRows(tables, "enhanced_notes")) {
    if (!enhancedNote.content || !enhancedNote.session_id) {
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
      type: "frontmatter-batch",
      items: frontmatterBatchItems,
    });
  }

  return { dirs, operations };
}
