import { useCallback, useMemo } from "react";

import { useListener } from "../contexts/listener";
import * as persisted from "../store/tinybase/persisted";
import type { PersistFinalCallback } from "../store/zustand/listener/transcript";
import { id } from "../utils";
import { useSTTConnection } from "./useSTTConnection";

export function useStartListening(sessionId: string) {
  const start = useListener((state) => state.start);
  const conn = useSTTConnection();
  const store = persisted.UI.useStore(persisted.STORE_ID);
  const keywords = useVocabs();

  const persistFinal = useCallback<PersistFinalCallback>((words) => {
    if (!store || words.length === 0) {
      return;
    }

    let transcriptId: string | undefined;
    store.forEachRow("transcripts", (rowId, _forEachCell) => {
      if (store.getCell("transcripts", rowId, "session_id") === sessionId) {
        transcriptId = rowId;
      }
    });

    if (!transcriptId) {
      transcriptId = id();
      store.setRow("transcripts", transcriptId, {
        session_id: sessionId,
        user_id: "",
        created_at: new Date().toISOString(),
      });
    }

    words.forEach((word) => {
      store.setRow("words", id(), {
        transcript_id: transcriptId!,
        text: word.text,
        start_ms: word.start_ms,
        end_ms: word.end_ms,
        channel: word.channel,
        user_id: "",
        created_at: new Date().toISOString(),
      });
    });
  }, [store, sessionId, keywords]);

  const startListening = useCallback(() => {
    if (!conn) {
      console.error("no_stt_connection");
      return;
    }

    start(
      {
        session_id: sessionId,
        languages: ["en"],
        onboarding: false,
        record_enabled: true,
        model: conn.model,
        base_url: conn.baseUrl,
        api_key: conn.apiKey,
        keywords,
      },
      {
        persistFinal,
      },
    );
  }, [conn, persistFinal, sessionId, start]);

  return startListening;
}

function useVocabs() {
  const table = persisted.UI.useResultTable(persisted.QUERIES.visibleVocabs, persisted.STORE_ID);

  const ret = useMemo(() => {
    return Object.values(table).map(({ text }) => text as string);
  }, [table]);

  return ret;
}
