import { useCallback, useMemo } from "react";

import { useConfigValue } from "../config/use-config";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";
import type { HandlePersistCallback } from "../store/zustand/listener/transcript";
import { id } from "../utils";
import { useSTTConnection } from "./useSTTConnection";

export function useStartListening(sessionId: string) {
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const start = useListener((state) => state.start);
  const conn = useSTTConnection();
  const store = main.UI.useStore(main.STORE_ID);
  const keywords = useVocabs();
  const languages = useConfigValue<string[]>("spoken_languages");

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

    const handlePersist: HandlePersistCallback = (words) => {
      if (words.length === 0) {
        return;
      }

      words.forEach((word) => {
        store.setRow("words", id(), {
          transcript_id: transcriptId,
          text: word.text,
          start_ms: word.start_ms,
          end_ms: word.end_ms,
          channel: word.channel,
          user_id: user_id ?? "",
          created_at: new Date().toISOString(),
        });
      });
    };

    start(
      {
        session_id: sessionId,
        languages,
        onboarding: false,
        record_enabled: true,
        model: conn.model,
        base_url: conn.baseUrl,
        api_key: conn.apiKey,
        keywords,
      },
      {
        handlePersist,
      },
    );
  }, [conn, store, sessionId, start, keywords, languages]);

  return startListening;
}

function useVocabs() {
  const table = main.UI.useResultTable(main.QUERIES.visibleVocabs, main.STORE_ID);

  const ret = useMemo(() => {
    return Object.values(table).map(({ text }) => text as string);
  }, [table]);

  return ret;
}
