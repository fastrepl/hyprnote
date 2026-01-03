import { sep } from "@tauri-apps/api/path";

import type {
  SpeakerHintStorage,
  TranscriptStorage,
  WordStorage,
} from "@hypr/store";

import {
  type CollectorResult,
  getSessionDir,
  iterateTableRows,
  type TablesContent,
} from "../utils";

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
