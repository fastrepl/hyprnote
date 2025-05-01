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
              key={tab.name}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                current === tab.name && "bg-neutral-100 font-medium",
              )}
              onClick={() => onTabClick(tab.name)}
            >
              <TabIcon tab={tab.name} />
              <span>
                {tab.name === "general"
                  ? <Trans>General</Trans>
                  : tab.name === "notifications"
                  ? <Trans>Notifications</Trans>
                  : tab.name === "sound"
                  ? <Trans>Sound</Trans>
                  : tab.name === "templates"
                  ? <Trans>Templates</Trans>
                  : tab.name === "extensions"
                  ? <Trans>Extensions</Trans>
                  : tab.name === "ai"
                  ? <Trans>AI</Trans>
                  : tab.name === "lab"
                  ? <Trans>Lab</Trans>
                  : tab.name === "feedback"
                  ? <Trans>Feedback</Trans>
                  : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
