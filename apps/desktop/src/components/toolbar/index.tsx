import clsx from "clsx";
import { useLocation } from "@tanstack/react-router";
import SettingsPanel from "@/components/settings-panel";
import { NewNoteButton } from "@/components/toolbar/new-note-button";
import { useOngoingSession } from "@/contexts/ongoing-session";

import { SearchBar, SearchIconButton, SearchPalette } from "../search";
import { RightPanelButton } from "./right-panel-button";
import { HomeButton } from "./home-button";
import { LeftSidebarButton } from "./left-sidebar-button";
import { SessionIndicator } from "./session-indicator";

export default function Toolbar() {
  const { listening, session } = useOngoingSession((s) => ({
    listening: s.listening,
    session: s.session,
  }));

  const { pathname } = useLocation();
  const inMeetingAndNotInNote =
    listening && session !== null && pathname !== `/app/note/${session.id}`;

  return (
    <>
      <header
        className={clsx([
          "flex w-full items-center justify-between",
          "border-b border-border bg-neutral-50",
          "min-h-11 p-1 px-2",
        ])}
        data-tauri-drag-region
      >
        <div className="w-40 flex items-center" data-tauri-drag-region>
          <LeftSidebarButton type="toolbar" />
          <HomeButton />
          <NewNoteButton />
        </div>

        {inMeetingAndNotInNote ? (
          <SessionIndicator sessionId={session.id} />
        ) : (
          <SearchBar />
        )}

        <div
          className="flex w-40 items-center justify-end"
          data-tauri-drag-region
        >
          <SearchIconButton isShown={inMeetingAndNotInNote} />
          <RightPanelButton />
          <SettingsPanel />
        </div>
      </header>

      <SearchPalette />
    </>
  );
}
