import { createFileRoute, Outlet } from "@tanstack/react-router";
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

import { cn } from "@hypr/ui/lib/utils";

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
    <div className={cn(["flex h-full"])}>
      <div className={cn(["w-60 flex flex-col bg-white"])}>
        <div
          className={cn([
            "flex-1 flex flex-col justify-between",
            "overflow-y-auto",
            "px-2 pb-2",
          ])}
        >
          <Group tabs={group1Tabs} activeTab={search.tab} expandHeight={true} includeTrafficLight={true} />

          <div>
            <Group tabs={group2Tabs} activeTab={search.tab} />
            <Group tabs={group3Tabs} activeTab={search.tab} />
          </div>
        </div>
      </div>

      <div
        className={cn([
          "flex-1 flex flex-col",
          "h-full w-full",
          "overflow-hidden",
          "bg-white",
        ])}
      >
        <header
          data-tauri-drag-region
          className={cn([
            "h-12 w-full",
            "flex items-center justify-between",
            "my-2 p-2",
            "bg-gray-50 rounded-md",
          ])}
        >
          <div className="w-40"></div>
          <h1 data-tauri-drag-region className={cn(["text-md font-semibold capitalize"])}>
            {info(search.tab).label}
          </h1>
          <div className="w-40"></div>
        </header>

        <div
          className={cn([
            "flex-1 w-full",
            "overflow-y-auto",
            "p-6 mb-2",
            "border border-gray-200 rounded-md",
          ])}
        >
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
  return (
    <div
      className={cn([
        "rounded-md bg-gray-50",
        "px-2 py-2 my-2",
        expandHeight && "flex-1",
      ])}
    >
      {includeTrafficLight && <div data-tauri-drag-region className="h-9" />}
      {tabs.map((tab) => {
        const tabInfo = info(tab);
        const Icon = tabInfo.icon;

        return (
          <button
            key={tab}
            className={cn([
              "flex w-full items-center gap-3",
              "rounded-md px-3 py-2.5",
              "text-md text-gray-700",
              "bg-gray-50 transition-colors",
              activeTab === tab
                ? "font-medium text-gray-900 bg-gray-200"
                : "hover:bg-gray-100",
            ])}
            onClick={() => navigate({ search: { tab } })}
          >
            <Icon className="h-5 w-5" />
            <span>{tabInfo.label}</span>
          </button>
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
