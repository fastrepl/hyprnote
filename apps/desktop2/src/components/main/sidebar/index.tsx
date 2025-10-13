import { clsx } from "clsx";
import { PanelLeftCloseIcon } from "lucide-react";

import { useSearch } from "../../../contexts/search";
import { useShell } from "../../../contexts/shell";
import { ProfileSection } from "./profile";
import { SearchResults } from "./search";
import { TimelineView } from "./timeline";

export function LeftSidebar() {
  const { toggleLeftSidebar } = useShell();
  const { query } = useSearch();

  const showSearchResults = query.trim() !== "";

  return (
    <div className="h-full flex flex-col overflow-hidden w-[220px] shrink-0">
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
          onClick={toggleLeftSidebar}
          className="cursor-pointer h-5 w-5 mr-2"
        />
      </header>

      <div
        className={clsx([
          "flex flex-col flex-1 overflow-hidden",
          "p-1 pr-0 gap-1",
        ])}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          {showSearchResults ? <SearchResults /> : <TimelineView />}
        </div>
        <ProfileSection />
      </div>
    </div>
  );
}
