import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { useEffect } from "react";

import { useAITask } from "../contexts/ai-task";
import * as persisted from "../store/tinybase/persisted";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { getTaskState } from "../store/zustand/ai-task/tasks";
import type { Tab } from "../store/zustand/tabs/schema";
import { useLanguageModel } from "./useLLMConnection";
import { useTaskStatus } from "./useTaskStatus";

export function useAutoGenerateTitle(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();

  const title = persisted.UI.useCell("sessions", sessionId, "title", persisted.STORE_ID);
  const enhancedMd = persisted.UI.useCell("sessions", sessionId, "enhanced_md", persisted.STORE_ID);
  const prevEnhancedMd = usePreviousValue(enhancedMd);

  const taskId = createTaskId(sessionId, "title");

  const updateTitle = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ title: input }),
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
        updateTitle(streamedText);
      }
    },
    onError: () => {
      console.error("Auto-generate title failed:", error?.message || "Unknown error");
    },
  });

  useEffect(() => {
    if (!model || isGenerating) {
      return;
    }

    const hasNewEnhancedContent = enhancedMd && enhancedMd !== prevEnhancedMd;
    const needsTitle = !title;

    if (hasNewEnhancedContent && needsTitle) {
      void generate(taskId, {
        model,
        taskType: "title",
        args: { sessionId },
      });
    }
  }, [enhancedMd, prevEnhancedMd, title, model, isGenerating, generate, taskId, sessionId]);
}
