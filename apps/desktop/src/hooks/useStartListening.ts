import { useCallback } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import {
  commands as localSttCommands,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { useConfigValue, useConfigValues } from "../config/use-config";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/store/main";
import * as settings from "../store/tinybase/store/settings";
import type { SpeakerHintWithId, WordWithId } from "../store/transcript/types";
import {
  parseTranscriptHints,
  parseTranscriptWords,
  updateTranscriptHints,
  updateTranscriptWords,
} from "../store/transcript/utils";
import type { HandlePersistCallback } from "../store/zustand/listener/transcript";
import { id } from "../utils";
import { useKeywords } from "./useKeywords";
import { useSTTConnection } from "./useSTTConnection";

export function useStartListening(sessionId: string) {
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const record_enabled = useConfigValue("save_recordings");
  const languages = useConfigValue("spoken_languages");
  const { current_stt_provider, current_stt_model } = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
  ] as const);

  const start = useListener((state) => state.start);
  const { conn, isLocalModel } = useSTTConnection();
  const auth = useAuth();
  const billing = useBillingAccess();

  const keywords = useKeywords(sessionId);

  const resetSttModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    () => "",
    [],
    settings.STORE_ID,
  );

  const startListening = useCallback(() => {
    if (!conn || !store) {
      if (current_stt_provider && current_stt_model) {
        const isCloud =
          current_stt_provider === "hyprnote" && current_stt_model === "cloud";

        if (isLocalModel) {
          void localSttCommands
            .isModelDownloaded(current_stt_model as SupportedSttModel)
            .then((result) => {
              if (result.status === "ok" && !result.data) {
                resetSttModel();
              }
            });
        } else if (isCloud && (!auth?.session || !billing.isPro)) {
          resetSttModel();
        }
      }
      return;
    }

    const transcriptId = id();
    const startedAt = Date.now();

    store.setRow("transcripts", transcriptId, {
      session_id: sessionId,
      user_id: user_id ?? "",
      created_at: new Date().toISOString(),
      started_at: startedAt,
      words: "[]",
      speaker_hints: "[]",
    });

    const eventId = store.getCell("sessions", sessionId, "event_id");
    void analyticsCommands.event({
      event: "session_started",
      has_calendar_event: !!eventId,
      stt_provider: conn.provider,
      stt_model: conn.model,
    });

    const handlePersist: HandlePersistCallback = (words, hints) => {
      if (words.length === 0) {
        return;
      }

      store.transaction(() => {
        const existingWords = parseTranscriptWords(store, transcriptId);
        const existingHints = parseTranscriptHints(store, transcriptId);

        const newWords: WordWithId[] = [];
        const newWordIds: string[] = [];

        words.forEach((word) => {
          const wordId = id();

          newWords.push({
            id: wordId,
            text: word.text,
            start_ms: word.start_ms,
            end_ms: word.end_ms,
            channel: word.channel,
          });

          newWordIds.push(wordId);
        });

        const newHints: SpeakerHintWithId[] = [];

        if (conn.provider === "deepgram") {
          hints.forEach((hint) => {
            if (hint.data.type !== "provider_speaker_index") {
              return;
            }

            const wordId = newWordIds[hint.wordIndex];
            const word = words[hint.wordIndex];
            if (!wordId || !word) {
              return;
            }

            newHints.push({
              id: id(),
              word_id: wordId,
              type: "provider_speaker_index",
              value: JSON.stringify({
                provider: hint.data.provider ?? conn.provider,
                channel: hint.data.channel ?? word.channel,
                speaker_index: hint.data.speaker_index,
              }),
            });
          });
        }

        updateTranscriptWords(store, transcriptId, [
          ...existingWords,
          ...newWords,
        ]);
        updateTranscriptHints(store, transcriptId, [
          ...existingHints,
          ...newHints,
        ]);
      });
    };

    start(
      {
        session_id: sessionId,
        languages,
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
  }, [
    conn,
    store,
    sessionId,
    start,
    keywords,
    user_id,
    record_enabled,
    languages,
    current_stt_provider,
    current_stt_model,
    isLocalModel,
    auth,
    billing.isPro,
    resetSttModel,
  ]);

  return startListening;
}
