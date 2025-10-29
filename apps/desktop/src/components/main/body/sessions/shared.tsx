import { useMemo } from "react";

import { useListener } from "../../../../contexts/listener";
import * as persisted from "../../../../store/tinybase/persisted";
import type { Tab } from "../../../../store/zustand/tabs/schema";
import { type EditorView } from "../../../../store/zustand/tabs/schema";

export function useHasTranscript(sessionId: string): boolean {
  const transcriptIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.transcriptBySession,
    sessionId,
    persisted.STORE_ID,
  );

  return !!transcriptIds && transcriptIds.length > 0;
}

export function useCurrentTab(tab: Extract<Tab, { type: "sessions" }>): EditorView {
  const hasTranscript = useHasTranscript(tab.id);
  const isListenerActive = useListener((state) => state.status === "running_active" && state.sessionId === tab.id);

  return useMemo(
    () => {
      if (tab.state.editor) {
        return tab.state.editor as EditorView;
      }

      if (isListenerActive) {
        return "raw";
      }

      return hasTranscript ? "enhanced" : "raw";
    },
    [tab.state.editor, isListenerActive, hasTranscript],
  );
}
