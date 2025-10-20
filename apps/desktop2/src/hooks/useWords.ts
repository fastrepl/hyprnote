import { useCallback } from "react";
import * as persisted from "../store/tinybase/persisted";
import type { Word } from "../types/transcript";

export const useWords = (sessionId: string) => {
  const sessionRow = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const words: Word[] = sessionRow.transcript
    ? (JSON.parse(sessionRow.transcript as string).words || [])
    : [];

  const setWords = useCallback(
    (newWords: Word[]) => {
      if (!store) {
        return;
      }

      const updatedTranscript = {
        words: newWords,
      };

      store.setCell(
        "sessions",
        sessionId,
        "transcript",
        JSON.stringify(updatedTranscript),
      );
    },
    [store, sessionId],
  );

  return { words, setWords };
};
