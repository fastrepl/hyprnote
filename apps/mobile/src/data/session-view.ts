import {
  computeCurrentNoteTab,
  createEditorTabs,
  type SessionNoteView,
} from "@anlg/utils/session";

export type SessionViewSelection = {
  sessionId: string;
  active: boolean;
  view: SessionNoteView;
};

export function sessionView({
  sessionId,
  active,
  hasRecordingHistory,
  hasSummary,
  hasTranscript,
  selection,
}: {
  sessionId: string;
  active: boolean;
  hasRecordingHistory: boolean;
  hasSummary: boolean;
  hasTranscript: boolean;
  selection: SessionViewSelection | null;
}) {
  const enhancedNoteIds =
    hasSummary || (!active && hasRecordingHistory) ? ["summary"] : [];
  const canShowTranscript = active || hasRecordingHistory || hasTranscript;
  const tabs = createEditorTabs({ enhancedNoteIds, canShowTranscript });
  const current = computeCurrentNoteTab(
    selection?.sessionId === sessionId && selection.active === active
      ? selection.view
      : null,
    active,
    enhancedNoteIds,
    canShowTranscript,
  );
  return {
    tabs,
    current,
    selectedIndex: tabs.findIndex(
      (tab) =>
        tab.type === current.type &&
        (tab.type !== "enhanced" ||
          (current.type === "enhanced" && tab.id === current.id)),
    ),
  };
}
