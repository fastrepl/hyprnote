import { useMatch, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";

import { useHyprSearch, useLeftSidebar, useOngoingSession } from "@/contexts";
import SettingsButton from "../settings-panel";
import { LeftSidebarButton } from "../toolbar/buttons/left-sidebar-button";
import { AllList } from "./notes-list";
import OngoingSession from "./ongoing-session";
import { SearchList } from "./search-list";

export default function LeftSidebar() {
  const { isExpanded } = useLeftSidebar();
  const { listening, sessionId } = useOngoingSession((s) => ({
    listening: s.listening,
    sessionId: s.sessionId,
  }));

  const { isSearching, matches } = useHyprSearch((s) => ({
    isSearching: !!s.query,
    matches: s.matches,
  }));

  const search = useSearch({ strict: false });
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });

  const isInOngoingNoteMain = noteMatch?.params.id === sessionId;
  const isInOngoingNoteSub = noteMatch?.params.id === sessionId;
  const isInOngoingNote = isInOngoingNoteMain || isInOngoingNoteSub;
  const inMeetingAndNotInNote = listening && sessionId !== null && !isInOngoingNote;

  if (search.window === "sub") {
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

      {inMeetingAndNotInNote && <OngoingSession sessionId={sessionId} />}

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

            <div className="flex items-center p-2 border-t">
              <SettingsButton />
            </div>
          </>
        )}
    </motion.nav>
  );
}
