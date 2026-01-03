import { sep } from "@tauri-apps/api/path";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type {
  SpeakerHintStorage,
  TranscriptStorage,
  WordStorage,
} from "@hypr/store";

import {
  createModeAwarePersister,
  getDataDir,
  getSessionDir,
  iterateTableRows,
  type PersisterMode,
  type TablesContent,
  writeJsonFiles,
} from "./utils";

type TranscriptWithData = TranscriptStorage & {
  id: string;
  words: Array<WordStorage & { id: string }>;
  speaker_hints: Array<SpeakerHintStorage & { id: string }>;
};

type TranscriptJson = {
  transcripts: TranscriptWithData[];
};

function collectTranscriptWriteOps(
  tables: TablesContent | undefined,
  dataDir: string,
): {
  dirs: Set<string>;
  operations: Array<{ path: string; content: TranscriptJson }>;
} {
  const dirs = new Set<string>();
  const operations: Array<{ path: string; content: TranscriptJson }> = [];

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
    const session = tables?.sessions?.[sessionId];
    const folderPath = session?.folder_id ?? "";
    const sessionDir = getSessionDir(dataDir, sessionId, folderPath);
    dirs.add(sessionDir);

    operations.push({
      path: [sessionDir, "_transcript.json"].join(sep()),
      content: { transcripts: sessionTranscripts },
    });
  }

  return { dirs, operations };
}

export function createTranscriptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createModeAwarePersister(store, {
    label: "TranscriptPersister",
    mode: config.mode,
    load: async () => undefined,
    save: async () => {
      const tables = store.getTables() as TablesContent | undefined;
      const dataDir = await getDataDir();
      const { dirs, operations } = collectTranscriptWriteOps(tables, dataDir);
      await writeJsonFiles(operations, dirs);
    },
  });
}
