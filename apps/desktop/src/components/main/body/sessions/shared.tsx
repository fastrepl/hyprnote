import { useMemo } from "react";

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

  return useMemo(
    () => (tab.state.editor ?? (hasTranscript ? "enhanced" : "raw")) as EditorView,
    [tab.state.editor, hasTranscript],
  );
}
