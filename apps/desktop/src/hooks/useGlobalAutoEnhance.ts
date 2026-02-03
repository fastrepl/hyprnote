import { usePrevious } from "@uidotdev/usehooks";
import { useEffect, useRef } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { md2json } from "@hypr/tiptap/shared";

import { useAITask } from "../contexts/ai-task";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/store/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { useLanguageModel, useLLMConnection } from "./useLLMConnection";

const MIN_WORDS_FOR_ENHANCEMENT = 5;

export function useGlobalAutoEnhance() {
  const model = useLanguageModel();
  const { conn: llmConn } = useLLMConnection();
  const generate = useAITask((state) => state.generate);

  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const indexes = main.UI.useIndexes(main.STORE_ID);

  const listenerStatus = useListener((state) => state.live.status);
  const liveSessionId = useListener((state) => state.live.sessionId);
  const prevListenerStatus = usePrevious(listenerStatus);
  const prevLiveSessionId = usePrevious(liveSessionId);

  const startedSessionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const listenerJustStopped =
      prevListenerStatus === "active" && listenerStatus !== "active";
    const sessionId = prevLiveSessionId;

    if (!listenerJustStopped || !sessionId) {
      return;
    }

    if (startedSessionsRef.current.has(sessionId)) {
      return;
    }

    if (!store || !indexes || !model) {
      return;
    }

    const transcriptIds = indexes.getSliceRowIds(
      main.INDEXES.transcriptBySession,
      sessionId,
    );
    if (!transcriptIds || transcriptIds.length === 0) {
      return;
    }

    const firstTranscriptId = transcriptIds[0];
    const wordsJson = store.getCell("transcripts", firstTranscriptId, "words");
    const words = wordsJson
      ? (JSON.parse(wordsJson as string) as unknown[])
      : [];
    if (words.length < MIN_WORDS_FOR_ENHANCEMENT) {
      return;
    }

    const existingNoteIds = indexes.getSliceRowIds(
      main.INDEXES.enhancedNotesBySession,
      sessionId,
    );
    const existingDefaultNote = existingNoteIds.find((id) => {
      const templateId = store.getCell("enhanced_notes", id, "template_id");
      return !templateId;
    });

    let enhancedNoteId: string;
    if (existingDefaultNote) {
      enhancedNoteId = existingDefaultNote;
    } else {
      enhancedNoteId = crypto.randomUUID();
      const userId = store.getValue("user_id");
      const nextPosition = existingNoteIds.length + 1;

      store.setRow("enhanced_notes", enhancedNoteId, {
        user_id: userId || "",
        session_id: sessionId,
        content: "",
        position: nextPosition,
        title: "Summary",
        template_id: undefined,
      });
    }

    startedSessionsRef.current.add(sessionId);

    void analyticsCommands.event({
      event: "note_enhanced",
      is_auto: true,
      llm_provider: llmConn?.providerId,
      llm_model: llmConn?.modelId,
    });

    const capturedStore = store;
    const capturedNoteId = enhancedNoteId;
    const capturedSessionId = sessionId;
    const capturedModel = model;

    const taskId = createTaskId(capturedNoteId, "enhance");
    void generate(taskId, {
      model: capturedModel,
      taskType: "enhance",
      args: { sessionId: capturedSessionId, enhancedNoteId: capturedNoteId },
      onComplete: (text) => {
        if (!text || !capturedStore) return;
        try {
          const jsonContent = md2json(text);
          capturedStore.setPartialRow("enhanced_notes", capturedNoteId, {
            content: JSON.stringify(jsonContent),
          });

          const currentTitle = capturedStore.getCell(
            "sessions",
            capturedSessionId,
            "title",
          );
          const trimmedTitle =
            typeof currentTitle === "string" ? currentTitle.trim() : "";
          if (!trimmedTitle) {
            const titleTaskId = createTaskId(capturedSessionId, "title");
            void generate(titleTaskId, {
              model: capturedModel,
              taskType: "title",
              args: { sessionId: capturedSessionId },
              onComplete: (titleText) => {
                if (titleText && capturedStore) {
                  const trimmed = titleText.trim();
                  if (trimmed && trimmed !== "<EMPTY>") {
                    capturedStore.setPartialRow("sessions", capturedSessionId, {
                      title: trimmed,
                    });
                  }
                }
              },
            });
          }
        } catch (error) {
          console.error("Failed to convert markdown to JSON:", error);
        }
      },
    });
  }, [
    listenerStatus,
    prevListenerStatus,
    prevLiveSessionId,
    store,
    indexes,
    model,
    llmConn,
    generate,
  ]);
}
