import { usePrevious } from "@uidotdev/usehooks";
import { useEffect, useRef } from "react";

import { useAITask } from "../contexts/ai-task";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { getTaskState } from "../store/zustand/ai-task/tasks";
import { useTabs } from "../store/zustand/tabs";
import type { Tab } from "../store/zustand/tabs/schema";
import { useLanguageModel } from "./useLLMConnection";

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();
  const { updateSessionTabState } = useTabs();

  const listenerStatus = useListener((state) => state.status);
  const prevListenerStatus = usePrevious(listenerStatus);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );
  const hasTranscript = !!transcriptIds && transcriptIds.length > 0;

  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  const enhanceTaskId = createTaskId(sessionId, "enhance");
  const titleTaskId = createTaskId(sessionId, "title");

  const updateEnhancedMd = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ enhanced_md: input }),
    [],
    main.STORE_ID,
  );

  const updateTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ title: input }),
    [],
    main.STORE_ID,
  );

  const { generate, rawStatus: enhanceStatus, streamedText: enhanceText } = useAITask((state) => {
    const taskState = getTaskState(state.tasks, enhanceTaskId);
    return {
      generate: state.generate,
      rawStatus: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
    };
  });

  const { rawStatus: titleStatus, streamedText: titleText } = useAITask((state) => {
    const taskState = getTaskState(state.tasks, titleTaskId);
    return {
      rawStatus: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
    };
  });

  const isEnhancingRef = useRef(false);

  useEffect(() => {
    const listenerJustStopped = prevListenerStatus === "running_active" && listenerStatus !== "running_active";

    if (listenerJustStopped && hasTranscript && model && !isEnhancingRef.current) {
      isEnhancingRef.current = true;
      updateSessionTabState(tab, { editor: "enhanced" });

      void generate(enhanceTaskId, {
        model,
        taskType: "enhance",
        args: { sessionId },
      });
    }
  }, [
    listenerStatus,
    prevListenerStatus,
    hasTranscript,
    model,
    generate,
    enhanceTaskId,
    sessionId,
    updateSessionTabState,
  ]);

  useEffect(() => {
    if (enhanceStatus === "success" && isEnhancingRef.current) {
      if (enhanceText) {
        updateEnhancedMd(enhanceText);
      }

      if (!title && model) {
        void generate(titleTaskId, {
          model,
          taskType: "title",
          args: { sessionId },
        });
      } else {
        isEnhancingRef.current = false;
      }
    }

    if (enhanceStatus === "error") {
      isEnhancingRef.current = false;
    }
  }, [enhanceStatus, enhanceText, updateEnhancedMd, title, model, generate, titleTaskId, sessionId]);

  useEffect(() => {
    if (titleStatus === "success" && isEnhancingRef.current) {
      if (titleText) {
        updateTitle(titleText);
      }
      isEnhancingRef.current = false;
    }

    if (titleStatus === "error") {
      isEnhancingRef.current = false;
    }
  }, [titleStatus, titleText, updateTitle]);
}
