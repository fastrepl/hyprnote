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
  const navigate = Route.useNavigate();

  const topTabs = TABS.filter((tab) => !info(tab).bottom);
  const bottomTabs = TABS.filter((tab) => info(tab).bottom);

  return (
    <div className="flex h-full">
      <div className="w-60 border-r border-neutral-200 flex flex-col bg-neutral-50">
        <div data-tauri-drag-region className="h-8" />

        <div className="flex-1 flex flex-col justify-between overflow-y-auto py-4">
          <div className="space-y-1 px-4">
            {topTabs.map((tab) => {
              const tabInfo = info(tab);
              const Icon = tabInfo.icon;
              return (
                <button
                  key={tab}
                  className={cn([
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    "text-neutral-700 hover:bg-neutral-100",
                  ], [
                    search.tab === tab && "bg-neutral-100 font-medium text-neutral-900",
                  ])}
                  onClick={() => navigate({ search: { tab } })}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tabInfo.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-1 px-4">
            {bottomTabs.map((tab) => {
              const tabInfo = info(tab);
              const Icon = tabInfo.icon;
              return (
                <button
                  key={tab}
                  className={cn([
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    "text-neutral-700 hover:bg-neutral-100",
                  ], [
                    search.tab === tab && "bg-neutral-100 font-medium text-neutral-900",
                  ])}
                  onClick={() => navigate({ search: { tab } })}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tabInfo.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex h-full w-full flex-col overflow-hidden bg-white">
        <header
          data-tauri-drag-region
          className="h-8 w-full flex items-center justify-between border-b border-neutral-200 px-2"
        >
          <div className="w-40"></div>
          <h1 data-tauri-drag-region className="text-md font-semibold capitalize">
            {info(search.tab).label}
          </h1>
          <div className="w-40"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const info = (tab: typeof TABS[number]) => {
  switch (tab) {
    case "general":
      return {
        label: "General",
        icon: Settings2,
        bottom: false,
      };
    case "calendar":
      return {
        label: "Calendar",
        icon: CalendarDays,
        bottom: false,
      };
    case "ai":
      return {
        label: "Hyprnote AI",
        icon: Sparkles,
        bottom: false,
      };
    case "notifications":
      return {
        label: "Notifications",
        icon: Bell,
        bottom: false,
      };
    case "integrations":
      return {
        label: "Integrations",
        icon: Puzzle,
        bottom: false,
      };
    case "templates":
      return {
        label: "Templates",
        icon: BookText,
        bottom: false,
      };
    case "feedback":
      return {
        label: "Feedback",
        icon: MessageCircleQuestion,
        bottom: true,
      };
    case "developers":
      return {
        label: "Talk to developers",
        icon: Settings2,
        bottom: true,
      };
    case "billing":
      return {
        label: "Billing",
        icon: CreditCard,
        bottom: true,
      };
  }
};
