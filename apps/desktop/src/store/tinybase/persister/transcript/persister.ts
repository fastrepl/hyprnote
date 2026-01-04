import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { createSessionDirPersister, getDataDir } from "../utils";
import { collectTranscriptWriteOps } from "./collect";
import { loadAllTranscriptData } from "./load";

export function createTranscriptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "TranscriptPersister",
    collect: collectTranscriptWriteOps,
    load: async (): Promise<Content<Schemas> | undefined> => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllTranscriptData(dataDir);
        const hasData =
          Object.keys(data.transcripts).length > 0 ||
          Object.keys(data.words).length > 0 ||
          Object.keys(data.speaker_hints).length > 0;
        if (!hasData) {
          return undefined;
        }
        return [
          {
            transcripts: data.transcripts,
            words: data.words,
            speaker_hints: data.speaker_hints,
          },
          {},
        ] as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[TranscriptPersister] load error:", error);
        return undefined;
      }
    },
  });
}
