import { Trans } from "@lingui/react/macro";

import { cn } from "@hypr/ui/lib/utils";
import { TabIcon } from "./tab-icon";
import { type Tab, TABS } from "./types";

interface MainSidebarProps {
  current: Tab;
  onTabClick: (tab: Tab) => void;
}

export function MainSidebar({ current, onTabClick }: MainSidebarProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                current === tab && "bg-neutral-100 font-medium",
              )}
              onClick={() => onTabClick(tab)}
            >
              <TabIcon tab={tab} />
              <span>
                {tab === "general"
                  ? <Trans>General</Trans>
                  : tab === "notifications"
                  ? <Trans>Notifications</Trans>
                  : tab === "sound"
                  ? <Trans>Sound</Trans>
                  : tab === "extensions"
                  ? <Trans>Extensions</Trans>
                  : tab === "ai"
                  ? <Trans>AI</Trans>
                  : tab === "lab"
                  ? <Trans>Lab</Trans>
                  : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
