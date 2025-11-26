import { useCallback, useRef } from "react";

import type { BatchParams } from "@hypr/plugin-listener2";

import { useConfigValue } from "../config/use-config";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";
import type { HandlePersistCallback } from "../store/zustand/listener/transcript";
import { type Tab, useTabs } from "../store/zustand/tabs";
import { id } from "../utils";
import { useKeywords } from "./useKeywords";
import { useSTTConnection } from "./useSTTConnection";

type RunOptions = {
  handlePersist?: HandlePersistCallback;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  keywords?: string[];
  languages?: string[];
};

export const useRunBatch = (sessionId: string) => {
  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const runBatch = useListener((state) => state.runBatch);
  const sessionTab = useTabs((state) => {
    const found = state.tabs.find(
      (tab): tab is Extract<Tab, { type: "sessions" }> =>
        tab.type === "sessions" && tab.id === sessionId,
    );
    return found ?? null;
  });
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);

  const sessionTabRef = useRef(sessionTab);
  sessionTabRef.current = sessionTab;

  const { conn } = useSTTConnection();
  const keywords = useKeywords(sessionId);
  const languages = useConfigValue("spoken_languages");

  return useCallback(
    async (filePath: string, options?: RunOptions) => {
      if (!store || !conn || !runBatch) {
        console.error("no_batch_connection");
        return;
      }

      const provider: BatchParams["provider"] | null = (() => {
        if (conn.provider === "deepgram") {
          return "deepgram";
        }

        if (conn.provider === "hyprnote" && conn.model.startsWith("am-")) {
          return "am";
        }

        return null;
      })();

      if (!provider) {
        console.error("unsupported_batch_provider", conn.provider);
        return;
      }

      if (sessionTabRef.current) {
        updateSessionTabState(sessionTabRef.current, {
          editor: { type: "transcript" },
        });
      }

      const transcriptId = id();
      const createdAt = new Date().toISOString();

      store.setRow("transcripts", transcriptId, {
        session_id: sessionId,
        user_id: user_id ?? "",
        created_at: createdAt,
        started_at: Date.now(),
      });

      const handlePersist: HandlePersistCallback | undefined =
        options?.handlePersist;

      const persist =
        handlePersist ??
        ((words, hints) => {
          if (words.length === 0) {
            return;
          }

          const wordIds: string[] = [];

          words.forEach((word) => {
            const wordId = id();

            store.setRow("words", wordId, {
              transcript_id: transcriptId,
              text: word.text,
              start_ms: word.start_ms,
              end_ms: word.end_ms,
              channel: word.channel,
              user_id: user_id ?? "",
              created_at: new Date().toISOString(),
            });

            wordIds.push(wordId);
          });

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
        });

      const params: BatchParams = {
        session_id: sessionId,
        provider,
        file_path: filePath,
        model: options?.model ?? conn.model,
        base_url: options?.baseUrl ?? conn.baseUrl,
        api_key: options?.apiKey ?? conn.apiKey,
        keywords: options?.keywords ?? keywords ?? [],
        languages: options?.languages ?? languages ?? [],
      };

      await runBatch(params, { handlePersist: persist, sessionId });
    },
    [
      conn,
      keywords,
      languages,
      runBatch,
      sessionId,
      store,
      updateSessionTabState,
      user_id,
    ],
  );
};
