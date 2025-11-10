import { useCallback } from "react";

import { useConfigValue } from "../config/use-config";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";
import type { HandlePersistCallback } from "../store/zustand/listener/transcript";
import { id } from "../utils";
import { useKeywords } from "./useKeywords";
import { useSTTConnection } from "./useSTTConnection";

export function useStartListening(sessionId: string) {
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const record_enabled = useConfigValue("save_recordings");

  const start = useListener((state) => state.start);
  const conn = useSTTConnection();

  const keywords = useKeywords(sessionId);

  const startListening = useCallback(() => {
    if (!conn || !store) {
      console.error("no_stt_connection");
      return;
    }

    const transcriptId = id();
    const startedAt = Date.now();

    store.setRow("transcripts", transcriptId, {
      session_id: sessionId,
      user_id: user_id ?? "",
      created_at: new Date().toISOString(),
      started_at: startedAt,
    });

    const handlePersist: HandlePersistCallback = (words, hints) => {
      if (words.length === 0) {
        return;
      }

      store.transaction(() => {
        const wordIds: string[] = [];

        words.forEach((word) => {
          const wordId = id();
          const createdAt = new Date().toISOString();

          store.setRow("words", wordId, {
            transcript_id: transcriptId,
            text: word.text,
            start_ms: word.start_ms,
            end_ms: word.end_ms,
            channel: word.channel,
            user_id: user_id ?? "",
            created_at: createdAt,
          });

          wordIds.push(wordId);
        });

        if (conn.provider === "deepgram") {
          hints.forEach((hint) => {
            if (hint.data.type !== "provider_speaker_index") {
              return;
            }

            const wordId = wordIds[hint.wordIndex];
            const word = words[hint.wordIndex];
            if (!wordId || !word) {
              return;
            }

            store.setRow("speaker_hints", id(), {
              transcript_id: transcriptId,
              word_id: wordId,
              type: "provider_speaker_index",
              value: JSON.stringify({
                provider: hint.data.provider ?? conn.provider,
                channel: hint.data.channel ?? word.channel,
                speaker_index: hint.data.speaker_index,
              }),
              user_id: user_id ?? "",
              created_at: new Date().toISOString(),
            });
          });
        }
      });
    };

    start(
      {
        session_id: sessionId,
        languages: ["en"],
        onboarding: false,
        record_enabled,
        model: conn.model,
        base_url: conn.baseUrl,
        api_key: conn.apiKey,
        keywords,
      },
      {
        handlePersist,
      },
    );
  }, [conn, store, sessionId, start, keywords]);

  return startListening;
}
