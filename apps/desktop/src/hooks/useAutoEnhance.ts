import { useEffect, useState } from "react";

import * as main from "../store/tinybase/store/main";
import type { Tab } from "../store/zustand/tabs/schema";
import { useAutoEnhanceRunner } from "./autoEnhance/runner";
import { useListenerStopTrigger } from "./autoEnhance/trigger";

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );
  const hasTranscript = !!transcriptIds && transcriptIds.length > 0;

  const { justStopped, reset } = useListenerStopTrigger(sessionId);
  const runner = useAutoEnhanceRunner(tab, transcriptIds ?? [], hasTranscript);

  const [skipReason, setSkipReason] = useState<string | null>(null);

  useEffect(() => {
    if (justStopped) {
      reset();
      const result = runner.run();
      if (result.type === "skipped") {
        setSkipReason(result.reason);
      }
    }
  }, [justStopped, reset, runner.run]);

  useEffect(() => {
    if (skipReason) {
      const timer = setTimeout(() => setSkipReason(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [skipReason]);

  return { skipReason };
}
