import { createFileRoute, Outlet } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  AudioLines,
  Bell,
  BookText,
  Brain,
  CalendarDays,
  CreditCard,
  ExternalLinkIcon,
  MessageCircleQuestion,
  MoreVertical,
  Plus,
  Puzzle,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useCallback } from "react";
import { z } from "zod";

import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { cn } from "@hypr/utils";
import { useTemplateNavigation } from "../../../components/settings/template/use-template-navigation";
import * as persisted from "../../../store/tinybase/persisted";

const TABS = [
  "general",
  "calendar",
  "notifications",
  "transcription",
  "intelligence",
  "memory",
  "templates",
  "integrations",
  "feedback",
  "developers",
  "billing",
] as const;

const validateSearch = z.object({
  tab: z.enum(TABS).default("general"),
  templateId: z.string().optional(),
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
        <Header />
        <div className="flex-1 w-full overflow-y-auto scrollbar-none p-6 border border-neutral-200 rounded-lg">
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
              "w-full justify-between",
              "font-normal",
              activeTab === tab ? "bg-neutral-200 hover:bg-neutral-200" : "hover:bg-neutral-100",
            ])}
            onClick={() => handleTabClick(tab)}
          >
            <div className="flex items-center gap-2">
              <Icon size={16} className="shrink-0" />
              <span>{tabInfo.label}</span>
            </div>
            {(tab === "developers" || tab === "feedback") && <ExternalLinkIcon className="shrink-0 text-neutral-500" />}
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
    case "transcription":
      return {
        label: "Transcription",
        icon: AudioLines,
        group: 1,
      };
    case "intelligence":
      return {
        label: "Intelligence",
        icon: Sparkles,
        group: 1,
      };
    case "memory":
      return {
        label: "Memory",
        icon: Brain,
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

function Header() {
  const search = Route.useSearch();
  const { goToList } = useTemplateNavigation();

  return (
    <>
      {search.tab === "templates" && search.templateId
        ? (
          <InnerHeader
            templateId={search.templateId}
            onBack={goToList}
          />
        )
        : <TopLevelHeader />}
    </>
  );
}

function TopLevelHeader() {
  const search = Route.useSearch();
  const { createAndEdit } = useTemplateNavigation();

  return (
    <header
      data-tauri-drag-region
      className="h-9 w-full bg-neutral-50 rounded-lg flex items-center justify-center relative"
    >
      <h1 data-tauri-drag-region className="font-semibold capitalize select-none cursor-default">
        {info(search.tab).label}
      </h1>
      {search.tab === "templates" && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 h-7 w-7"
          onClick={createAndEdit}
        >
          <Plus size={16} />
        </Button>
      )}
    </header>
  );
}

function InnerHeader({ templateId, onBack }: { templateId: string; onBack: () => void }) {
  const value = persisted.UI.useCell("templates", templateId, "title", persisted.STORE_ID);
  const handleDelete = useDeleteTemplate(templateId);

  return (
    <header
      data-tauri-drag-region
      className="h-9 w-full bg-neutral-50 rounded-lg flex items-center justify-center px-2 relative"
    >
      <div className="absolute left-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-7 w-7"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 max-w-md">
        <h1 className="text-sm font-semibold cursor-pointer hover:text-neutral-600 transition-colors truncate">
          {value || "Untitled"}
        </h1>
      </div>

      <div className="absolute right-2 flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function useDeleteTemplate(templateId: string) {
  const handleDeleteRow = persisted.UI.useDelRowCallback(
    "templates",
    templateId,
    persisted.STORE_ID,
  );

  const navigate = Route.useNavigate();

  const handleDelete = useCallback(() => {
    handleDeleteRow();
    navigate({ search: { tab: "templates" } });
  }, [handleDeleteRow, navigate]);

  return handleDelete;
}
