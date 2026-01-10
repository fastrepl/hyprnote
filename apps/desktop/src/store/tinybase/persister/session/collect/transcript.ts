import { sep } from "@tauri-apps/api/path";

import type { SpeakerHintStorage, WordStorage } from "@hypr/store";

import {
  buildSessionPath,
  type CollectorResult,
  iterateTableRows,
  type TablesContent,
} from "../../shared";
import type { TranscriptJson } from "../types";

export function collectTranscriptWriteOps(
  tables: TablesContent,
  dataDir: string,
  changedSessionIds?: Set<string>,
): CollectorResult {
  const operations: CollectorResult["operations"] = [];

  const transcripts = iterateTableRows(tables, "transcripts");

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

  for (const transcript of transcripts) {
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
    const sessionDir = buildSessionPath(dataDir, sessionId, folderPath);

    const content: TranscriptJson = { transcripts: sessionTranscripts };
    operations.push({
      type: "json",
      path: [sessionDir, "transcript.json"].join(sep()),
      content,
    });
  }

  return { operations };
}
