import { useMatch } from "@tanstack/react-router";
import { motion } from "motion/react";

import { useHyprSearch, useLeftSidebar, useOngoingSession } from "@/contexts";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { LeftSidebarButton } from "../toolbar/buttons/left-sidebar-button";
import AllList from "./all-list";
import OngoingSession from "./ongoing-session";
import SearchList from "./search-list";

export default function LeftSidebar() {
  const { isExpanded } = useLeftSidebar();
  const { listening, ongoingSessionId } = useOngoingSession((s) => ({
    listening: s.listening,
    ongoingSessionId: s.sessionId,
  }));

  const { isSearching, matches } = useHyprSearch((s) => ({
    isSearching: !!s.query,
    matches: s.matches,
  }));

  const windowLabel = getCurrentWebviewWindowLabel();
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });

  const isInOngoingNoteMain = noteMatch?.params.id === ongoingSessionId;
  const isInOngoingNoteSub = noteMatch?.params.id === ongoingSessionId;
  const isInOngoingNote = isInOngoingNoteMain || isInOngoingNoteSub;
  const inMeetingAndNotInNote = listening && ongoingSessionId !== null && !isInOngoingNote;

  if (windowLabel !== "main") {
    return null;
  }

  return (
    <motion.nav
      layout
      initial={{ width: isExpanded ? 240 : 0, opacity: isExpanded ? 1 : 0 }}
      animate={{ width: isExpanded ? 240 : 0, opacity: isExpanded ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col overflow-hidden border-r bg-neutral-50"
    >
      <div
        data-tauri-drag-region
        className="flex items-center justify-end min-h-11 px-2"
      >
        <LeftSidebarButton type="sidebar" />
      </div>

      {inMeetingAndNotInNote && <OngoingSession sessionId={ongoingSessionId} />}

      {isSearching
        ? (
          <div className="flex-1 h-full overflow-y-auto">
            <SearchList matches={matches} />
          </div>
        )
        : (
          <>
            <div className="flex-1 h-full overflow-y-auto">
              <AllList />
            </div>
          </>
        )}
    </motion.nav>
  );
}
