import { sep } from "@tauri-apps/api/path";
import { exists, readDir, readTextFile } from "@tauri-apps/plugin-fs";

import type {
  SpeakerHintStorage,
  TranscriptStorage,
  WordStorage,
} from "@hypr/store";

import { isFileNotFoundError } from "../utils";

type TranscriptWithData = TranscriptStorage & {
  id: string;
  words: Array<WordStorage & { id: string }>;
  speaker_hints: Array<SpeakerHintStorage & { id: string }>;
};

type TranscriptJson = {
  transcripts: TranscriptWithData[];
};

export type LoadedTranscriptData = {
  transcripts: Record<string, TranscriptStorage>;
  words: Record<string, WordStorage>;
  speaker_hints: Record<string, SpeakerHintStorage>;
};

const LABEL = "TranscriptPersister";

async function loadTranscriptsRecursively(
  sessionsDir: string,
  currentPath: string,
  result: LoadedTranscriptData,
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
    const transcriptPath = [sessionsDir, entryPath, "_transcript.json"].join(s);
    const hasTranscriptJson = await exists(transcriptPath);

    if (hasTranscriptJson) {
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
        continue;
      }
    }

    const metaPath = [sessionsDir, entryPath, "_meta.json"].join(s);
    const hasMetaJson = await exists(metaPath);
    if (!hasMetaJson) {
      await loadTranscriptsRecursively(sessionsDir, entryPath, result);
    }
  }
}

export async function loadAllTranscriptData(
  dataDir: string,
): Promise<LoadedTranscriptData> {
  const result: LoadedTranscriptData = {
    transcripts: {},
    words: {},
    speaker_hints: {},
  };

  const sessionsDir = [dataDir, "sessions"].join(sep());

  try {
    await loadTranscriptsRecursively(sessionsDir, "", result);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${LABEL}] load error:`, error);
    }
  }

  return result;
}
