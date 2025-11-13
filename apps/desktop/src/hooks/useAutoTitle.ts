import { useCallback } from "react";

import * as main from "../store/tinybase/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import type { Tab } from "../store/zustand/tabs";
import { useAITaskTask } from "./useAITaskTask";
import { useLanguageModel } from "./useLLMConnection";

export function useAutoTitle(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();

  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  const enhanceTaskId = createTaskId(sessionId, "enhance");
  const titleTaskId = createTaskId(sessionId, "title");

  const updateTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ title: input }),
    [],
    main.STORE_ID,
  );

  const titleTask = useAITaskTask(titleTaskId, "title", {
    onSuccess: ({ text }) => {
      if (text) {
        updateTitle(text);
      }
    },
  });

  const attemptGenerateTitle = useCallback(() => {
    const trimmedTitle = title?.trim();
    if (trimmedTitle) {
      console.log("skip_title", "title already exists");
      return;
    }

    if (!model) {
      console.log("skip_title", "no model");
      return;
    }

    console.log("generate_title", "starting task");
    void titleTask.start({
      model,
      args: { sessionId },
    });
  }, [title, model, titleTask.status, titleTask.start, sessionId]);

  useAITaskTask(enhanceTaskId, "enhance", {
    onSuccess: attemptGenerateTitle,
  });
}
