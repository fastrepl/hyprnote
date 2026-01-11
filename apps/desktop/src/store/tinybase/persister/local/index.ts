import * as _UI from "tinybase/ui-react/with-schemas";

import { type Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { STORE_ID } from "../../store/main";
import { createLocalPersister } from "./persister";

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

type MigratedWord = {
  id: string;
  user_id: string;
  created_at: string;
  transcript_id: string;
  text: string;
  start_ms: number;
  end_ms: number;
  channel: number;
  speaker?: string;
  metadata?: string;
};

type MigratedHint = {
  id: string;
  user_id: string;
  created_at: string;
  transcript_id: string;
  word_id: string;
  type: string;
  value: string;
};

function migrateWordsAndHintsToTranscripts(store: Store): boolean {
  const wordIds = store.getRowIds("words");
  if (wordIds.length === 0) {
    return false;
  }

  const wordsByTranscript = new Map<string, MigratedWord[]>();
  const hintsByTranscript = new Map<string, MigratedHint[]>();

  for (const wordId of wordIds) {
    const row = store.getRow("words", wordId);
    if (!row || typeof row.transcript_id !== "string") continue;

    const word: MigratedWord = {
      id: wordId,
      user_id: (row.user_id as string) ?? "",
      created_at: (row.created_at as string) ?? "",
      transcript_id: row.transcript_id,
      text: (row.text as string) ?? "",
      start_ms: (row.start_ms as number) ?? 0,
      end_ms: (row.end_ms as number) ?? 0,
      channel: (row.channel as number) ?? 0,
      speaker: row.speaker as string | undefined,
      metadata: row.metadata as string | undefined,
    };

    const list = wordsByTranscript.get(row.transcript_id) ?? [];
    list.push(word);
    wordsByTranscript.set(row.transcript_id, list);
  }

  const hintIds = store.getRowIds("speaker_hints");
  for (const hintId of hintIds) {
    const row = store.getRow("speaker_hints", hintId);
    if (!row || typeof row.transcript_id !== "string") continue;

    const hint: MigratedHint = {
      id: hintId,
      user_id: (row.user_id as string) ?? "",
      created_at: (row.created_at as string) ?? "",
      transcript_id: row.transcript_id,
      word_id: (row.word_id as string) ?? "",
      type: (row.type as string) ?? "",
      value: (row.value as string) ?? "{}",
    };

    const list = hintsByTranscript.get(row.transcript_id) ?? [];
    list.push(hint);
    hintsByTranscript.set(row.transcript_id, list);
  }

  store.transaction(() => {
    for (const transcriptId of store.getRowIds("transcripts")) {
      const words = wordsByTranscript.get(transcriptId) ?? [];
      const hints = hintsByTranscript.get(transcriptId) ?? [];

      words.sort((a, b) => a.start_ms - b.start_ms);

      store.setCell(
        "transcripts",
        transcriptId,
        "words",
        JSON.stringify(words),
      );
      store.setCell(
        "transcripts",
        transcriptId,
        "speaker_hints",
        JSON.stringify(hints),
      );
    }

    for (const wordId of wordIds) {
      store.delRow("words", wordId);
    }
    for (const hintId of hintIds) {
      store.delRow("speaker_hints", hintId);
    }
  });

  return true;
}

export function useLocalPersister(store: Store) {
  return useCreatePersister(
    store,
    async (store) => {
      const persister = createLocalPersister(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
      });

      await persister.load();

      const migrated = migrateWordsAndHintsToTranscripts(store as Store);

      if (migrated) {
        await persister.save();
      }

      return persister;
    },
    [],
  );
}
