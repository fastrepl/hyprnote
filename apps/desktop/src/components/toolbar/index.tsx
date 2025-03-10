import { useLocation } from "@tanstack/react-router";
import clsx from "clsx";

import SettingsPanel from "@/components/settings-panel";
import { NewNoteButton } from "@/components/toolbar/buttons/new-note-button";
import { useOngoingSession } from "@/contexts/ongoing-session";
import { RoutePath } from "@/types";

import { SearchBar, SearchIconButton, SearchPalette } from "../search";
import { RightPanelButton } from "./buttons/right-panel-button";
import { LeftSidebarButton } from "./buttons/left-sidebar-button";
import { SessionIndicator } from "./session-indicator";
import { ShareButton } from "./buttons/share-button";

export default function Toolbar() {
  const { listening, sessionId } = useOngoingSession((s) => ({
    listening: s.listening,
    sessionId: s.sessionId,
  }));

  const getNoteURL = (id: string) => {
    const pattern: RoutePath = "/app/note/$id";
    return pattern.replace("$id", id);
  };

  const { pathname } = useLocation();
  const inMeetingAndNotInNote =
    listening && sessionId !== null && pathname !== getNoteURL(sessionId);

  return (
    <>
      <header
        className={clsx([
          "flex w-full items-center justify-between",
          "border-b border-border bg-neutral-50 dark:bg-neutral-600 dark:border-neutral-600",
          "min-h-11 p-1 px-2",
        ])}
        data-tauri-drag-region
      >
        <div className="w-40 flex items-center" data-tauri-drag-region>
          <LeftSidebarButton type="toolbar" />
          {/* <HomeButton /> */}
          <NewNoteButton />
        </div>

        {inMeetingAndNotInNote ? (
          <SessionIndicator sessionId={sessionId} />
        ) : (
          <SearchBar />
        )}

        <div
          className="flex w-40 items-center justify-end"
          data-tauri-drag-region
        >
          <SearchIconButton isShown={inMeetingAndNotInNote} />
          {pathname.includes("/app/note/") && <ShareButton />}
          <RightPanelButton />
          <SettingsPanel />
        </div>
      </header>

      <SearchPalette />
    </>
  );
}
