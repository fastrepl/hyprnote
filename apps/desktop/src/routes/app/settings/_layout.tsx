import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/utils";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  Bell,
  BookText,
  CalendarDays,
  CreditCard,
  Edit,
  MessageCircleQuestion,
  MoreVertical,
  Plus,
  Puzzle,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { useUpdateTemplate } from "../../../components/settings/shared.tsx";

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
  templateId: z.string().optional(),
});

export const Route = createFileRoute("/app/settings/_layout")({
  validateSearch,
  component: Component,
});

function Component() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const group1Tabs = TABS.filter((tab) => info(tab).group === 1);
  const group2Tabs = TABS.filter((tab) => info(tab).group === 2);
  const group3Tabs = TABS.filter((tab) => info(tab).group === 3);

  const handleCreateTemplate = () => {
    // TODO: Implement create template logic
    console.log("Create new template");
  };

  const isEditingTemplate = search.tab === "templates" && search.templateId;

  return (
    <div className={cn(["flex h-full p-1 gap-1"])}>
      <aside className="w-52 flex flex-col justify-between overflow-hidden gap-1">
        <Group tabs={group1Tabs} activeTab={search.tab} expandHeight={true} includeTrafficLight={true} />
        <Group tabs={group2Tabs} activeTab={search.tab} />
        <Group tabs={group3Tabs} activeTab={search.tab} />
      </aside>

      <div className="flex-1 flex flex-col gap-1 h-full w-full overflow-hidden bg-white">
        {isEditingTemplate
          ? (
            <TemplateEditorHeader
              templateId={search.templateId!}
              onBack={() => navigate({ search: { tab: "templates" } })}
            />
          )
          : (
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
                  onClick={handleCreateTemplate}
                >
                  <Plus size={16} />
                </Button>
              )}
            </header>
          )}

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

function TemplateEditorHeader({ templateId, onBack }: { templateId: string; onBack: () => void }) {
  const { value, handle } = useUpdateTemplate(templateId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleDuplicate = () => {
    // TODO: Implement duplicate logic
    console.log("Duplicate template:", templateId);
  };

  const handleDelete = () => {
    // TODO: Implement delete logic with confirmation dialog
    console.log("Delete template:", templateId);
    onBack();
  };

  return (
    <header
      data-tauri-drag-region
      className="h-9 w-full bg-neutral-50 rounded-lg flex items-center justify-center px-2 relative"
    >
      {/* Left side - Back button */}
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

      {/* Center - Title */}
      <div className="flex items-center justify-center gap-2 max-w-md">
        {isEditingTitle
          ? (
            <Input
              autoFocus
              value={value.title || ""}
              onChange={(e) => handle.setField("title", e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingTitle(false);
                }
              }}
              className="text-sm font-semibold border-none p-0 h-auto focus-visible:ring-0 bg-transparent text-center"
              placeholder="Untitled"
            />
          )
          : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-semibold cursor-pointer hover:text-neutral-600 transition-colors truncate"
            >
              {value.title || "Untitled Template"}
            </h1>
          )}
      </div>

      {/* Right side - Edit and More buttons */}
      <div className="absolute right-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditingTitle(true)}
          className="h-7 w-7"
        >
          <Edit className="w-4 h-4" />
        </Button>

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
            <DropdownMenuItem onClick={handleDuplicate}>
              Duplicate
            </DropdownMenuItem>
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
