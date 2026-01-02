import { sep } from "@tauri-apps/api/path";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type {
  SpeakerHintStorage,
  TranscriptStorage,
  WordStorage,
} from "@hypr/store";

import { StoreOrMergeableStore } from "../store/shared";
import {
  ensureDirsExist,
  getDataDir,
  getSessionDir,
  iterateTableRows,
  type PersisterMode,
  type TablesContent,
} from "./utils";

type TranscriptWithData = TranscriptStorage & {
  id: string;
  words: Array<WordStorage & { id: string }>;
  speaker_hints: Array<SpeakerHintStorage & { id: string }>;
};

type TranscriptJson = {
  transcripts: TranscriptWithData[];
};

function collectTranscriptsBySession(
  tables: TablesContent | undefined,
): Map<string, TranscriptWithData[]> {
  const transcriptsBySession = new Map<string, TranscriptWithData[]>();

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

  return transcriptsBySession;
}

export function createTranscriptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  const loadFn =
    config.mode === "save-only" ? async () => undefined : async () => undefined;

  const saveFn =
    config.mode === "load-only"
      ? async () => {}
      : async () => {
          const tables = store.getTables() as TablesContent | undefined;
          const dataDir = await getDataDir();

          const transcriptsBySession = collectTranscriptsBySession(tables);
          if (transcriptsBySession.size === 0) {
            return;
          }

          const dirs = new Set<string>();
          const writeOperations: Array<{ path: string; content: string }> = [];

          for (const [sessionId, transcripts] of transcriptsBySession) {
            const session = tables?.sessions?.[sessionId];
            const folderPath = session?.folder_id ?? "";
            const sessionDir = getSessionDir(dataDir, sessionId, folderPath);
            dirs.add(sessionDir);

            const json: TranscriptJson = { transcripts };
            writeOperations.push({
              path: [sessionDir, "_transcript.json"].join(sep()),
              content: JSON.stringify(json, null, 2),
            });
          }

          try {
            await ensureDirsExist(dirs);
          } catch (e) {
            console.error("Failed to ensure dirs exist:", e);
            return;
          }

          for (const op of writeOperations) {
            try {
              await writeTextFile(op.path, op.content);
            } catch (e) {
              console.error(`Failed to write ${op.path}:`, e);
            }
          }
        };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    () => null,
    () => {},
    (error) => console.error("[TranscriptPersister]:", error),
    StoreOrMergeableStore,
  );
}
