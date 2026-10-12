import { type ReactNode } from "react";

import { useShell } from "~/contexts/shell";
import { LeftSidebar } from "~/sidebar";
import type { SidebarNoteFilter } from "~/sidebar/note-filter";
import { useTabs } from "~/store/zustand/tabs";

export function ClassicMainSidebar({
  folderFilter = null,
  noteFilter = "mine",
  timelineHeader,
  showIgnoredTimelineEvents,
  onShowIgnoredTimelineEventsChange,
}: {
  folderFilter?: string | null;
  noteFilter?: SidebarNoteFilter;
  timelineHeader?: ReactNode;
  showIgnoredTimelineEvents?: boolean;
  onShowIgnoredTimelineEventsChange?: (showIgnored: boolean) => void;
} = {}) {
  const { leftsidebar } = useShell();
  const currentTab = useTabs((state) => state.currentTab);
  const isOnboarding = currentTab?.type === "onboarding";

  if (!leftsidebar.expanded || isOnboarding) {
    return null;
  }

  return (
    <div className="h-full min-h-0 bg-[#FAF7F1] dark:bg-background">
      <LeftSidebar
        folderFilter={folderFilter}
        noteFilter={noteFilter}
        timelineHeader={timelineHeader}
        showIgnoredTimelineEvents={showIgnoredTimelineEvents}
        onShowIgnoredTimelineEventsChange={onShowIgnoredTimelineEventsChange}
      />
    </div>
  );
}
