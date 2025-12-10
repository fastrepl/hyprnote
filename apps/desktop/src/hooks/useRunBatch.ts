import { readFile } from "@tauri-apps/plugin-fs";
import { useCallback, useRef } from "react";

import type { BatchParams } from "@hypr/plugin-listener2";

import { useAuth } from "../auth";
import { useConfigValue } from "../config/use-config";
import { useListener } from "../contexts/listener";
import { env } from "../env";
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

  const { supabase, session } = useAuth() ?? {};

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

        if (conn.provider === "soniox") {
          return "soniox";
        }

        if (conn.provider === "assemblyai") {
          return "assemblyai";
        }

        if (conn.provider === "hyprnote" && conn.model.startsWith("am-")) {
          return "am";
        }

        if (conn.provider === "hyprnote") {
          return "hyprnotecloud";
        }

        return null;
      })();

      if (!provider) {
        throw new Error(
          `Batch transcription is not supported for provider: ${conn.provider}`,
        );
      }

      let cloudFileId: string | undefined;
      let authorization: string | undefined;

      if (provider === "hyprnotecloud") {
        if (!supabase || !session) {
          throw new Error(
            "Authentication required for Hyprnote Cloud batch transcription",
          );
        }

        const fileBuffer = await readFile(filePath);
        const fileName = filePath.split("/").pop() ?? "audio.wav";
        const timestamp = Date.now();
        const uploadPath = `${session.user.id}/${timestamp}-${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("audio-files")
          .upload(uploadPath, fileBuffer, {
            contentType: "audio/wav",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `Failed to upload audio file: ${uploadError.message}`,
          );
        }

        cloudFileId = uploadPath;
        authorization = session.access_token;
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
        base_url:
          provider === "hyprnotecloud"
            ? env.VITE_API_URL
            : (options?.baseUrl ?? conn.baseUrl),
        api_key: options?.apiKey ?? conn.apiKey,
        keywords: options?.keywords ?? keywords ?? [],
        languages: options?.languages ?? languages ?? [],
        cloud_file_id: cloudFileId,
        authorization,
      };

      await runBatch(params, { handlePersist: persist, sessionId });
    },
    [
      conn,
      keywords,
      languages,
      runBatch,
      session,
      sessionId,
      store,
      supabase,
      updateSessionTabState,
      user_id,
    ],
  );
};
