import { clsx } from "clsx";
import { PanelLeftCloseIcon } from "lucide-react";

import { useSearch } from "../../../contexts/search/ui";
import { useShell } from "../../../contexts/shell";
import { ProfileSection } from "./profile";
import { SearchResults } from "./search";
import { TimelineView } from "./timeline";

export function LeftSidebar() {
  const { leftsidebar } = useShell();
  const { query } = useSearch();

  const showSearchResults = query.trim() !== "";

  return (
    <div className="h-full w-[280px] flex flex-col overflow-hidden shrink-0 gap-1">
      <header
        data-tauri-drag-region
        className={clsx([
          "flex flex-row shrink-0",
          "flex w-full items-center justify-end h-9 py-1",
          "rounded-lg",
          "pl-[72px] bg-color1",
        ])}
      >
        <PanelLeftCloseIcon
          onClick={leftsidebar.toggleExpanded}
          className="cursor-pointer h-5 w-5 mr-2"
        />
      </header>

      <div className="flex flex-col flex-1 overflow-hidden gap-1">
        <div className="flex-1 min-h-0 overflow-hidden">
          {showSearchResults ? <SearchResults /> : <TimelineView />}
        </div>
        <ProfileSection />
      </div>
    </div>
  );
}
