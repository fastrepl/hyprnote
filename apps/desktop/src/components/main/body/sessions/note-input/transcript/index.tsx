import { useCallback } from "react";

import { commands } from "@hypr/plugin-listener2";

import * as main from "../../../../../../store/tinybase/main";
import { id } from "../../../../../../utils";
import { TranscriptContainer } from "./shared";

export function Transcript({
  sessionId,
  isEditing,
}: {
  sessionId: string;
  isEditing: boolean;
}) {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const checkpoints = main.UI.useCheckpoints(main.STORE_ID);

  const handleExportVtt = useCallback(async () => {
    if (!store || !indexes) {
      return;
    }

    const transcriptIds = indexes.getSliceRowIds(
      main.INDEXES.transcriptBySession,
      sessionId,
    );

    const words: { text: string; start_ms: number; end_ms: number }[] = [];

    transcriptIds?.forEach((transcriptId) => {
      const wordIds = indexes.getSliceRowIds(
        main.INDEXES.wordsByTranscript,
        transcriptId,
      );

      wordIds?.forEach((wordId) => {
        const word = store.getRow("words", wordId);
        if (
          word &&
          typeof word.text === "string" &&
          typeof word.start_ms === "number" &&
          typeof word.end_ms === "number"
        ) {
          words.push({
            text: word.text,
            start_ms: word.start_ms,
            end_ms: word.end_ms,
          });
        }
      });
    });

    words.sort((a, b) => a.start_ms - b.start_ms);

    const result = await commands.exportToVtt(sessionId, words);
    if (result.status === "ok") {
      console.log("VTT exported to:", result.data);
    } else {
      console.error("Failed to export VTT:", result.error);
    }
  }, [store, indexes, sessionId]);

  const handleDeleteWord = useCallback(
    (wordId: string) => {
      if (!store || !indexes || !checkpoints) {
        return;
      }

      const speakerHintIds = indexes.getSliceRowIds(
        main.INDEXES.speakerHintsByWord,
        wordId,
      );

      speakerHintIds?.forEach((hintId) => {
        store.delRow("speaker_hints", hintId);
      });

      store.delRow("words", wordId);

      checkpoints.addCheckpoint("delete_word");
    },
    [store, indexes, checkpoints],
  );

  const handleAssignSpeaker = useCallback(
    (wordIds: string[], humanId: string) => {
      if (!store || !checkpoints) {
        return;
      }

      wordIds.forEach((wordId) => {
        const word = store.getRow("words", wordId);
        if (!word || typeof word.transcript_id !== "string") {
          return;
        }

        const hintId = id();
        store.setRow("speaker_hints", hintId, {
          transcript_id: word.transcript_id,
          word_id: wordId,
          type: "user_speaker_assignment",
          value: JSON.stringify({ human_id: humanId }),
          created_at: new Date().toISOString(),
        });
      });

      checkpoints.addCheckpoint("assign_speaker");
    },
    [store, checkpoints],
  );

  const operations = isEditing
    ? {
        onDeleteWord: handleDeleteWord,
        onAssignSpeaker: handleAssignSpeaker,
      }
    : undefined;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="flex justify-end p-2">
        <button
          onClick={handleExportVtt}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          Export VTT
        </button>
      </div>
      <TranscriptContainer sessionId={sessionId} operations={operations} />
    </div>
  );
}
