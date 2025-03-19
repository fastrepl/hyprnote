import { NewNoteButton } from "@/components/toolbar/buttons/new-note-button";
import { cn } from "@hypr/ui/lib/utils";
import { useMatch } from "@tanstack/react-router";
import { SearchBar } from "../search-bar";
import { LeftSidebarButton } from "./buttons/left-sidebar-button";
import { RightPanelButton } from "./buttons/right-panel-button";
import { ShareButton } from "./buttons/share-button";

export default function Toolbar() {
  const noteMainMatch = useMatch({ from: "/app/note/$id/main", shouldThrow: false });
  const noteSubMatch = useMatch({ from: "/app/note/$id/sub", shouldThrow: false });

  const isInNoteMain = noteMainMatch !== undefined;
  const isInNoteSub = noteSubMatch !== undefined;
  const isInNote = isInNoteMain || isInNoteSub;

  return (
    <header
      data-tauri-drag-region
      className={cn([
        "flex w-full items-center justify-between min-h-11 p-1 px-2 border-b",
        isInNoteMain ? "border-border" : "border-transparent",
        isInNoteMain ? "bg-neutral-50" : "bg-transparent",
      ])}
    >
      {!isInNoteSub && (
        <div className="w-40 flex items-center" data-tauri-drag-region>
          <LeftSidebarButton type="toolbar" />
          <NewNoteButton />
        </div>
      )}

      {isInNoteMain && <SearchBar />}

      {!isInNoteSub && (
        <div
          className="flex w-40 items-center justify-end"
          data-tauri-drag-region
        >
          {isInNote && <ShareButton />}
          <RightPanelButton />
        </div>
      )}

      {isInNoteSub && (
        <div className="flex ml-auto">
          <ShareButton />
        </div>
      )}
    </header>
  );
}
