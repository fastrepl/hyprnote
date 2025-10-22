import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Bell,
  BookText,
  CalendarDays,
  CreditCard,
  MessageCircleQuestion,
  Puzzle,
  Settings2,
  Sparkles,
} from "lucide-react";
import { z } from "zod";

const TABS = [
  "general",
  "calendar",
  "ai",
  "notifications",
  "integrations",
  "templates",
  "feedback",
  "developers",
  "billing",
] as const;

const validateSearch = z.object({
  tab: z.enum(TABS).default("general"),
});

export const Route = createFileRoute("/app/settings/_layout")({
  validateSearch,
  component: Component,
});

function Component() {
  const search = Route.useSearch();

  const group1Tabs = TABS.filter((tab) => info(tab).group === 1);
  const group2Tabs = TABS.filter((tab) => info(tab).group === 2);
  const group3Tabs = TABS.filter((tab) => info(tab).group === 3);

  return (
    <div className={cn(["flex h-full p-1 gap-1"])}>
      <aside className="w-52 flex flex-col justify-between overflow-hidden gap-1">
        <Group tabs={group1Tabs} activeTab={search.tab} expandHeight={true} includeTrafficLight={true} />
        <Group tabs={group2Tabs} activeTab={search.tab} />
        <Group tabs={group3Tabs} activeTab={search.tab} />
      </aside>

      <div className="flex-1 flex flex-col gap-1 h-full w-full overflow-hidden bg-white">
        <header
          data-tauri-drag-region
          className="h-9 w-full bg-neutral-50 rounded-lg flex items-center justify-center"
        >
          <h1 data-tauri-drag-region className="font-semibold capitalize select-none cursor-default">
            {info(search.tab).label}
          </h1>
        </header>

        <div className="flex-1 w-full overflow-y-auto p-6 border border-neutral-200 rounded-lg">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function Group(
  {
    tabs,
    activeTab,
    expandHeight = false,
    includeTrafficLight = false,
  }: {
    tabs: (typeof TABS)[number][];
    activeTab: typeof TABS[number];
    expandHeight?: boolean;
    includeTrafficLight?: boolean;
  },
) {
  const navigate = Route.useNavigate();

  const handleTabClick = async (tab: typeof TABS[number]) => {
    if (tab === "feedback") {
      await openUrl("https://hyprnote.canny.io/feature-requests");
    } else if (tab === "developers") {
      await openUrl("https://cal.com/team/hyprnote/welcome");
    } else {
      navigate({ search: { tab } });
    }
  };

  return (
    <div
      className={cn([
        "rounded-md bg-neutral-50",
        expandHeight && "flex-1",
      ])}
    >
      {includeTrafficLight && <div data-tauri-drag-region className="h-9" />}
      {tabs.map((tab) => {
        const tabInfo = info(tab);
        const Icon = tabInfo.icon;

        return (
          <Button
            key={tab}
            variant="ghost"
            className={cn([
              "w-full justify-start",
              "hover:bg-neutral-200 font-normal",
              activeTab === tab && "bg-neutral-200",
            ])}
            onClick={() => handleTabClick(tab)}
          >
            <Icon size={16} className="shrink-0" />
            <span>{tabInfo.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

const info = (tab: typeof TABS[number]) => {
  switch (tab) {
    case "general":
      return {
        label: "General",
        icon: Settings2,
        group: 1,
      };
    case "calendar":
      return {
        label: "Calendar",
        icon: CalendarDays,
        group: 1,
      };
    case "ai":
      return {
        label: "Hyprnote AI",
        icon: Sparkles,
        group: 1,
      };
    case "notifications":
      return {
        label: "Notifications",
        icon: Bell,
        group: 1,
      };
    case "integrations":
      return {
        label: "Integrations",
        icon: Puzzle,
        group: 1,
      };
    case "templates":
      return {
        label: "Templates",
        icon: BookText,
        group: 1,
      };
    case "feedback":
      return {
        label: "Feedback",
        icon: MessageCircleQuestion,
        group: 2,
      };
    case "developers":
      return {
        label: "Talk to developers",
        icon: Settings2,
        group: 2,
      };
    case "billing":
      return {
        label: "Billing",
        icon: CreditCard,
        group: 3,
      };
  }
};
