import { useMatch } from "@tanstack/react-router";

import { NewNoteButton } from "@/components/toolbar/buttons/new-note-button";
import { NewWindowButton } from "@/components/toolbar/buttons/new-window-button";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { cn } from "@hypr/ui/lib/utils";
import { SearchBar } from "../../search-bar";
import { LeftSidebarButton } from "../buttons/left-sidebar-button";
import { RightPanelButton } from "../buttons/right-panel-button";
import { ShareButton } from "../buttons/share-button";

export function MainToolbar() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  
  const isNote = !!noteMatch;
  const isMain = getCurrentWebviewWindowLabel() === "main";

  return (
    <header
      data-tauri-drag-region
      className={cn([
        "flex w-full items-center justify-between min-h-11 p-1 px-2 border-b",
        isMain ? "border-border bg-neutral-50" : "border-transparent bg-transparent",
      ])}
    >
      <div className="w-40 flex items-center justify-start" data-tauri-drag-region>
        {isNote && (
          <>
            <LeftSidebarButton type="toolbar" />
            <NewNoteButton />
          </>
        )}
      </div>

      <SearchBar />

      <div
        className="flex w-40 items-center justify-end"
        data-tauri-drag-region
      >
        {isMain && (
          <>
            {isNote && <ShareButton />}
            {(organizationMatch || humanMatch) && <NewWindowButton />}
            <RightPanelButton />
          </>
        )}
      </div>
    </header>
  );
}
