import { useLeftSidebar, useOngoingSession } from "@/contexts";
import { useMatch } from "@tanstack/react-router";
import { motion } from "motion/react";
import SettingsButton from "../settings-panel";
import { LeftSidebarButton } from "../toolbar/buttons/left-sidebar-button";
import { AllList } from "./notes-list";
import OngoingSession from "./ongoing-session";
import UpdateButton from "./update-button";

export default function LeftSidebar() {
  const { isExpanded } = useLeftSidebar();
  const match = useMatch({ from: "/app/note/$id/main", shouldThrow: false });
  const { listening, sessionId } = useOngoingSession((s) => ({
    listening: s.listening,
    sessionId: s.sessionId,
  }));

  const show = match !== undefined && isExpanded;

  const noteMainMatch = useMatch({ from: "/app/note/$id/main", shouldThrow: false });
  const noteSubMatch = useMatch({ from: "/app/note/$id/sub", shouldThrow: false });

  const isInOngoingNoteMain = noteMainMatch?.params.id === sessionId;
  const isInOngoingNoteSub = noteSubMatch?.params.id === sessionId;
  const isInOngoingNote = isInOngoingNoteMain || isInOngoingNoteSub;
  const inMeetingAndNotInNote = listening && sessionId !== null && !isInOngoingNote;

  return (
    <motion.nav
      layout
      initial={{ width: show ? 240 : 0, opacity: show ? 1 : 0 }}
      animate={{ width: show ? 240 : 0, opacity: show ? 1 : 0 }}
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

      <div className="flex-1 h-full overflow-y-auto">
        <AllList />
      </div>

      <UpdateButton />

      <div className="flex items-center p-2 border-t">
        <SettingsButton />
      </div>
    </motion.nav>
  );
}
