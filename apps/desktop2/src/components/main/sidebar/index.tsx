import { clsx } from "clsx";
import { PanelLeftCloseIcon } from "lucide-react";

import { useLeftSidebar } from "@hypr/utils/contexts";
import { NewNoteButton } from "./new-note-button";
import { ProfileSection } from "./profile";
import { TimelineView } from "./timeline";

export function LeftSidebar() {
  const { togglePanel: toggleLeftPanel } = useLeftSidebar();

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <header
        data-tauri-drag-region
        className={clsx([
          "flex flex-row shrink-0",
          "flex w-full items-center justify-between min-h-8 py-1 mt-1 ml-1",
          "rounded-lg",
          "pl-[72px] bg-neutral-50",
        ])}
      >
        <div className="flex-1" />
        <PanelLeftCloseIcon
          onClick={toggleLeftPanel}
          className="cursor-pointer h-5 w-5 mr-2"
        />
      </header>

      <div className="flex flex-col flex-1 overflow-hidden p-1 gap-1">
        <NewNoteButton />
        <TimelineView />
        <ProfileSection />
      </div>
    </div>
  );
}
