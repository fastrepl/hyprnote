import { createFileRoute, Outlet } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  AudioLines,
  Bell,
  BookText,
  CalendarDays,
  type LucideIcon,
  MessageCircleQuestion,
  Plus,
  Puzzle,
  Settings2,
  Sparkles,
  Trash2,
  UserIcon,
} from "lucide-react";
import { useCallback } from "react";
import { z } from "zod";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useTemplateNavigation } from "../../../components/settings/template/utils";
import * as main from "../../../store/tinybase/main";

const TAB_KEYS = [
  "general",
  "calendar",
  "notifications",
  "transcription",
  "intelligence",
  "templates",
  "integrations",
  "feedback",
  "developers",
  "account",
] as const;

type TabKey = (typeof TAB_KEYS)[number];

const TAB_CONFIG: Record<
  TabKey,
  {
    label: string;
    icon: LucideIcon;
    group: 1 | 2 | 3;
    disabled?: boolean;
  }
> = {
  general: {
    label: "General",
    icon: Settings2,
    group: 1,
  },
  calendar: {
    label: "Calendar",
    icon: CalendarDays,
    group: 1,
    disabled: true,
  },
  notifications: {
    label: "Notifications",
    icon: Bell,
    group: 1,
  },
  transcription: {
    label: "Transcription",
    icon: AudioLines,
    group: 1,
  },
  intelligence: {
    label: "Intelligence",
    icon: Sparkles,
    group: 1,
  },
  templates: {
    label: "Templates",
    icon: BookText,
    group: 1,
  },
  integrations: {
    label: "Integrations",
    icon: Puzzle,
    group: 1,
    disabled: true,
  },
  feedback: {
    label: "Feedback",
    icon: MessageCircleQuestion,
    group: 2,
  },
  developers: {
    label: "Talk to developers",
    icon: Settings2,
    group: 2,
  },
  account: {
    label: "Account",
    icon: UserIcon,
    group: 3,
  },
};

const getEnabledTabs = () =>
  TAB_KEYS.filter((key) => !TAB_CONFIG[key].disabled);
const DEFAULT_TAB = (getEnabledTabs()[0] ?? TAB_KEYS[0]) as TabKey;

const validateSearch = z.object({
  tab: z.enum(TAB_KEYS).default(DEFAULT_TAB),
  templateId: z.string().optional(),
});

export const Route = createFileRoute("/app/settings/_layout")({
  validateSearch,
  component: Component,
});

function Component() {
  const search = Route.useSearch();
  const enabledTabs = getEnabledTabs();

  const group1Tabs = enabledTabs.filter((tab) => info(tab).group === 1);
  const group2Tabs = enabledTabs.filter((tab) => info(tab).group === 2);
  const group3Tabs = enabledTabs.filter((tab) => info(tab).group === 3);

  return (
    <div className={cn(["flex h-full p-1 gap-1"])}>
      <aside className="w-52 flex flex-col justify-between overflow-hidden gap-1">
        <Group
          tabs={group1Tabs}
          activeTab={search.tab}
          expandHeight={true}
          includeTrafficLight={true}
        />
        <Group tabs={group2Tabs} activeTab={search.tab} />
        <Group tabs={group3Tabs} activeTab={search.tab} />
      </aside>

      <div className="flex-1 flex flex-col gap-1 h-full w-full overflow-hidden bg-white">
        <Header />
        <div className="flex-1 w-full overflow-y-auto scrollbar-hide p-6 border border-neutral-200 rounded-xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function Group({
  tabs,
  activeTab,
  expandHeight = false,
  includeTrafficLight = false,
}: {
  tabs: TabKey[];
  activeTab: TabKey;
  expandHeight?: boolean;
  includeTrafficLight?: boolean;
}) {
  const navigate = Route.useNavigate();

  const handleTabClick = async (tab: TabKey) => {
    if (tab === "feedback") {
      await openUrl("https://github.com/fastrepl/hyprnote/discussions");
    } else if (tab === "developers") {
      await openUrl("https://cal.com/team/hyprnote/welcome");
    } else {
      navigate({ search: { tab } });
    }
  };

  return (
    <div
      className={cn([
        "rounded-xl bg-neutral-50 py-1",
        expandHeight && "flex-1",
      ])}
    >
      {includeTrafficLight && <div data-tauri-drag-region className="h-9" />}
      {tabs.map((tab) => {
        const tabInfo = info(tab);
        const Icon = tabInfo.icon;

        return (
          <div className="px-1">
            <Button
              key={tab}
              variant="ghost"
              className={cn([
                "w-full justify-start",
                "font-normal",
                activeTab === tab
                  ? "bg-neutral-200 hover:bg-neutral-200"
                  : "hover:bg-neutral-100",
              ])}
              onClick={() => handleTabClick(tab)}
            >
              <Icon size={16} className="shrink-0" />
              {tabInfo.label}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

const info = (tab: TabKey) => TAB_CONFIG[tab];

function Header() {
  const search = Route.useSearch();
  const { goToList } = useTemplateNavigation();

  return (
    <>
      {search.tab === "templates" && search.templateId ? (
        <InnerHeader templateId={search.templateId} onBack={goToList} />
      ) : (
        <TopLevelHeader />
      )}
    </>
  );
}

function TopLevelHeader() {
  const search = Route.useSearch();
  const { createAndEdit } = useTemplateNavigation();

  return (
    <header
      data-tauri-drag-region
      className="h-9 w-full bg-neutral-50 rounded-xl flex items-center justify-center relative"
    >
      <h1
        data-tauri-drag-region
        className="font-semibold capitalize select-none cursor-default"
      >
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

function InnerHeader({
  templateId,
  onBack,
}: {
  templateId: string;
  onBack: () => void;
}) {
  const value = main.UI.useCell(
    "templates",
    templateId,
    "title",
    main.STORE_ID,
  );
  const handleDelete = useDeleteTemplate(templateId);

  return (
    <header
      data-tauri-drag-region
      className="h-9 w-full bg-neutral-50 rounded-xl flex items-center justify-center px-2 relative"
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

      <div className="absolute right-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}

function useDeleteTemplate(templateId: string) {
  const handleDeleteRow = main.UI.useDelRowCallback(
    "templates",
    templateId,
    main.STORE_ID,
  );

  const navigate = Route.useNavigate();

  const handleDelete = useCallback(() => {
    handleDeleteRow();
    navigate({ search: { tab: "templates" } });
  }, [handleDeleteRow, navigate]);

  return handleDelete;
}
