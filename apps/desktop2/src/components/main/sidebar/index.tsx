import { clsx } from "clsx";
import { PanelLeftCloseIcon } from "lucide-react";

import { useLeftSidebar } from "@hypr/utils/contexts";
import { ProfileSection } from "./profile";
import { TimelineView } from "./timeline";

export function LeftSidebar() {
  const { togglePanel: toggleLeftPanel } = useLeftSidebar();

  return (
    <div className="h-full border-r w-full flex flex-col overflow-hidden">
      <header
        data-tauri-drag-region
        className={clsx([
          "flex flex-row shrink-0",
          "flex w-full items-center justify-between min-h-11 py-1 px-2 border-b",
          "border-border bg-neutral-50",
          "pl-[72px]",
        ])}
      >
        <PanelLeftCloseIcon
          onClick={toggleLeftPanel}
          className="cursor-pointer h-5 w-5"
        />
      </header>

      <TimelineView />
      <ProfileSection />
    </div>
  );
}
