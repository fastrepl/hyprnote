import { usePrevious } from "@uidotdev/usehooks";
import { useCallback, useEffect } from "react";

import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { useTabs } from "../store/zustand/tabs";
import type { Tab } from "../store/zustand/tabs/schema";
import { useAITaskTask } from "./useAITaskTask";
import { useLanguageModel } from "./useLLMConnection";

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();
  const { updateSessionTabState } = useTabs();

  const listenerStatus = useListener((state) => state.live.status);
  const prevListenerStatus = usePrevious(listenerStatus);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );
  const hasTranscript = !!transcriptIds && transcriptIds.length > 0;

  const enhanceTaskId = createTaskId(sessionId, "enhance");

  const updateEnhancedMd = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ enhanced_md: input }),
    [],
    main.STORE_ID,
  );

  const enhanceTask = useAITaskTask(enhanceTaskId, "enhance", {
    onSuccess: ({ text }) => {
      if (text) {
        updateEnhancedMd(text);
      }
    },
  });

  const startEnhance = useCallback(() => {
    if (!model || !hasTranscript || enhanceTask.status === "generating") {
      return;
    }

    void enhanceTask.start({
      model,
      args: { sessionId },
    });
  }, [hasTranscript, model, enhanceTask.status, enhanceTask.start, sessionId]);

  useEffect(() => {
    const listenerJustStopped =
      prevListenerStatus === "running_active" &&
      listenerStatus !== "running_active";

    if (listenerJustStopped) {
      startEnhance();
      updateSessionTabState(tab, { editor: "enhanced" });
    }
  }, [listenerStatus, prevListenerStatus, startEnhance]);
}
