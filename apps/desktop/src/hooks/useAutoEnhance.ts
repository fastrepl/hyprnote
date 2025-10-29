import { usePrevious } from "@uidotdev/usehooks";
import { useEffect } from "react";

import { useAITask } from "../contexts/ai-task";
import { useListener } from "../contexts/listener";
import * as persisted from "../store/tinybase/persisted";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { getTaskState } from "../store/zustand/ai-task/tasks";
import { useTabs } from "../store/zustand/tabs";
import type { Tab } from "../store/zustand/tabs/schema";
import { useLanguageModel } from "./useLLMConnection";
import { useTaskStatus } from "./useTaskStatus";

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();
  const { updateSessionTabState } = useTabs();

  const listenerStatus = useListener((state) => state.status);
  const prevListenerStatus = usePrevious(listenerStatus);

  const transcriptIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.transcriptBySession,
    sessionId,
    persisted.STORE_ID,
  );
  const hasTranscript = !!transcriptIds && transcriptIds.length > 0;

  const taskId = createTaskId(sessionId, "enhance");

  const updateEnhancedMd = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ enhanced_md: input }),
    [],
    persisted.STORE_ID,
  );

  const { generate, rawStatus, streamedText, error } = useAITask((state) => {
    const taskState = getTaskState(state.tasks, taskId);
    return {
      generate: state.generate,
      rawStatus: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
      error: taskState?.error,
    };
  });

  const { isGenerating } = useTaskStatus(rawStatus, {
    onSuccess: () => {
      if (streamedText) {
        updateEnhancedMd(streamedText);
        updateSessionTabState(tab, { editor: "enhanced" });
      }
    },
    onError: () => {
      console.error("Auto-enhance failed:", error?.message || "Unknown error");
    },
  });

  useEffect(() => {
    if (!model) {
      console.log("[AutoEnhance] Skip: No language model available");
      return;
    }

    if (isGenerating) {
      console.log("[AutoEnhance] Skip: Already generating");
      return;
    }

    const justStoppedListening = prevListenerStatus === "running_active" && listenerStatus !== "running_active";

    if (!justStoppedListening) {
      return;
    }

    if (!hasTranscript) {
      console.log("[AutoEnhance] Skip: No transcript available after stopping");
      return;
    }

    void generate(taskId, {
      model,
      taskType: "enhance",
      args: { sessionId },
    });
  }, [listenerStatus, prevListenerStatus, hasTranscript, model, generate, taskId, sessionId]);
}
