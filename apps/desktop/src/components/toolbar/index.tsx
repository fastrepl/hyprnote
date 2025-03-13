import { useLocation, useMatch } from "@tanstack/react-router";

import { NewNoteButton } from "@/components/toolbar/buttons/new-note-button";
import { useOngoingSession } from "@/contexts/ongoing-session";
import { SearchBar, SearchIconButton, SearchPalette } from "../search";
import { LeftSidebarButton } from "./buttons/left-sidebar-button";
import { RightPanelButton } from "./buttons/right-panel-button";
import { ShareButton } from "./buttons/share-button";
import { SessionIndicator } from "./session-indicator";

export default function Toolbar() {
  const { listening, sessionId } = useOngoingSession((s) => ({
    listening: s.listening,
    sessionId: s.sessionId,
  }));

  const noteMainMatch = useMatch({ from: "/app/note/$id/main", shouldThrow: false });
  const noteSubMatch = useMatch({ from: "/app/note/$id/sub", shouldThrow: false });

  const isInNoteMain = noteMainMatch !== undefined;
  const isInOngoingNoteMain = noteMainMatch?.params.id === sessionId;
  const isInNoteSub = noteSubMatch !== undefined;
  const isInOngoingNoteSub = noteSubMatch?.params.id === sessionId;
  const isInNote = isInNoteMain || isInNoteSub;
  const isInOngoingNote = isInOngoingNoteMain || isInOngoingNoteSub;

  const inMeetingAndNotInNote = listening && sessionId !== null && !isInOngoingNote;

  return (
    <>
      <header
        className="flex w-full items-center justify-between border-b border-border bg-neutral-50 min-h-11 p-1 px-2"
        data-tauri-drag-region
      >
        {!isInNoteSub && (
          <div className="w-40 flex items-center" data-tauri-drag-region>
            <LeftSidebarButton type="toolbar" />
            <NewNoteButton />
          </div>
        )}

        {inMeetingAndNotInNote ? <SessionIndicator sessionId={sessionId} /> : <SearchBar />}

        {!isInNoteSub && (
          <div
            className="flex w-40 items-center justify-end"
            data-tauri-drag-region
          >
            <SearchIconButton isShown={inMeetingAndNotInNote} />
            {isInNote && <ShareButton />}
            <RightPanelButton />
          </div>
        )}

        {isInNote && (
          <div className="flex ml-auto">
            <ShareButton />
          </div>
        )}
      </header>

      <SearchPalette />
    </>
  );
}
