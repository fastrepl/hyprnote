import { useMatch, useSearch } from "@tanstack/react-router";

import { NewNoteButton } from "@/components/toolbar/buttons/new-note-button";
import { cn } from "@hypr/ui/lib/utils";
import { SearchBar } from "../search-bar";
import { LeftSidebarButton } from "./buttons/left-sidebar-button";
import { RightPanelButton } from "./buttons/right-panel-button";
import { ShareButton } from "./buttons/share-button";

export default function Toolbar() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });

  const isInNoteMain = noteMatch?.search.window === "main";

  return (
    <header
      data-tauri-drag-region
      className={cn([
        "flex w-full items-center justify-between min-h-11 p-1 px-2 border-b",
        isInNoteMain ? "border-border bg-neutral-50" : "border-transparent bg-transparent",
      ])}
    >
      {isInNoteMain && (
        <div className="w-40 flex items-center" data-tauri-drag-region>
          <LeftSidebarButton type="toolbar" />
          <NewNoteButton />
        </div>
      )}

      <SearchBar />

      <div
        className="flex w-40 items-center justify-end"
        data-tauri-drag-region
      >
        <ShareButton />
        {isInNoteMain && <RightPanelButton />}
      </div>
    </header>
  );
}
