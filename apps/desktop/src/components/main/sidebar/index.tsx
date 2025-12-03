import { AxeIcon, PanelLeftCloseIcon } from "lucide-react";
import { useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useSearch } from "../../../contexts/search/ui";
import { useShell } from "../../../contexts/shell";
import { useIsLinux } from "../../../hooks/usePlatform";
import { TrafficLights } from "../../window/traffic-lights";
import { BannerArea } from "./banner";
import { ProfileSection } from "./profile";
import { SearchResults } from "./search";
import { TimelineView } from "./timeline";

export function LeftSidebar() {
  const { leftsidebar } = useShell();
  const { query } = useSearch();
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const isLinux = useIsLinux();

  const showSearchResults = query.trim() !== "";

  return (
    <div className="h-full w-[280px] flex flex-col overflow-hidden shrink-0 gap-1">
      <header
        data-tauri-drag-region
        className={cn([
          "flex flex-row items-center",
          "w-full h-9 py-1",
          isLinux ? "pl-3 justify-between" : "pl-[72px] justify-end",
          "shrink-0",
          "rounded-xl bg-neutral-50",
        ])}
      >
        {isLinux && <TrafficLights />}
        <div className="flex items-center">
          {import.meta.env.DEV && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => windowsCommands.windowShow({ type: "devtool" })}
            >
              <AxeIcon size={16} />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={leftsidebar.toggleExpanded}
          >
            <PanelLeftCloseIcon size={16} />
          </Button>
        </div>
      </header>

      <div className="flex flex-col flex-1 overflow-hidden gap-1">
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {showSearchResults ? <SearchResults /> : <TimelineView />}
          <BannerArea isProfileExpanded={isProfileExpanded} />
        </div>
        <div className="relative z-30">
          <ProfileSection onExpandChange={setIsProfileExpanded} />
        </div>
      </div>
    </div>
  );
}
