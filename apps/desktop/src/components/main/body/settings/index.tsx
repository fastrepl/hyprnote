import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AudioLines,
  Bell,
  CalendarDays,
  type LucideIcon,
  MessageCircleQuestion,
  Settings2,
  SettingsIcon,
  Sparkles,
  UserIcon,
} from "lucide-react";
import { useCallback } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { SettingsAccount } from "../../../settings/account";
import { LLM } from "../../../settings/ai/llm";
import { STT } from "../../../settings/ai/stt";
import { SettingsCalendar } from "../../../settings/calendar";
import { SettingsGeneral } from "../../../settings/general";
import { SettingsNotifications } from "../../../settings/notification";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";

type SettingsTabKey =
  | "general"
  | "calendar"
  | "notifications"
  | "transcription"
  | "intelligence"
  | "account";

const TAB_CONFIG: Record<
  SettingsTabKey,
  {
    label: string;
    icon: LucideIcon;
    group: 1 | 2;
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
  account: {
    label: "Account",
    icon: UserIcon,
    group: 2,
  },
};

const TAB_KEYS: SettingsTabKey[] = [
  "general",
  "calendar",
  "notifications",
  "transcription",
  "intelligence",
  "account",
];

export const TabItemSettings: TabItem<Extract<Tab, { type: "settings" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<SettingsIcon className="w-4 h-4" />}
      title={"Settings"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentSettings({
  tab,
}: {
  tab: Extract<Tab, { type: "settings" }>;
}) {
  return (
    <StandardTabWrapper>
      <SettingsView tab={tab} />
    </StandardTabWrapper>
  );
}

function SettingsView({ tab }: { tab: Extract<Tab, { type: "settings" }> }) {
  const updateSettingsTabState = useTabs(
    (state) => state.updateSettingsTabState,
  );

  const activeTab = tab.state.tab;

  const setActiveTab = useCallback(
    (newTab: SettingsTabKey) => {
      updateSettingsTabState(tab, { tab: newTab });
    },
    [updateSettingsTabState, tab],
  );

  const group1Tabs = TAB_KEYS.filter((t) => TAB_CONFIG[t].group === 1);
  const group2Tabs = TAB_KEYS.filter((t) => TAB_CONFIG[t].group === 2);

  return (
    <div className={cn(["flex h-full p-1 gap-1"])}>
      <aside className="w-52 flex flex-col justify-between overflow-hidden gap-1">
        <Group
          tabs={group1Tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          expandHeight={true}
        />
        <Group tabs={["feedback", "developers"]} activeTab={activeTab} />
        <Group
          tabs={group2Tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </aside>

      <div className="flex-1 flex flex-col gap-1 h-full w-full overflow-hidden bg-white">
        <Header activeTab={activeTab} />
        <div className="flex-1 w-full overflow-y-auto scrollbar-hide p-6 border border-neutral-200 rounded-xl">
          <SettingsContent activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
}

function Group({
  tabs,
  activeTab,
  setActiveTab,
  expandHeight = false,
}: {
  tabs: (SettingsTabKey | "feedback" | "developers")[];
  activeTab: SettingsTabKey;
  setActiveTab?: (tab: SettingsTabKey) => void;
  expandHeight?: boolean;
}) {
  const handleTabClick = async (tab: SettingsTabKey | "feedback" | "developers") => {
    if (tab === "feedback") {
      await openUrl("https://github.com/fastrepl/hyprnote/discussions");
    } else if (tab === "developers") {
      await openUrl("https://cal.com/team/hyprnote/welcome");
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const getTabInfo = (tab: SettingsTabKey | "feedback" | "developers") => {
    if (tab === "feedback") {
      return { label: "Feedback", icon: MessageCircleQuestion };
    }
    if (tab === "developers") {
      return { label: "Talk to developers", icon: Settings2 };
    }
    return TAB_CONFIG[tab];
  };

  return (
    <div
      className={cn([
        "rounded-xl bg-neutral-50 py-1",
        expandHeight && "flex-1",
      ])}
    >
      {tabs.map((tab) => {
        const tabInfo = getTabInfo(tab);
        const Icon = tabInfo.icon;
        const isActive = tab !== "feedback" && tab !== "developers" && activeTab === tab;

        return (
          <div key={tab} className="px-1">
            <Button
              variant="ghost"
              className={cn([
                "w-full justify-start",
                "font-normal",
                isActive
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

function Header({ activeTab }: { activeTab: SettingsTabKey }) {
  return (
    <header className="h-9 w-full bg-neutral-50 rounded-xl flex items-center justify-center relative">
      <h1 className="font-semibold capitalize select-none cursor-default">
        {TAB_CONFIG[activeTab].label}
      </h1>
    </header>
  );
}

function SettingsContent({ activeTab }: { activeTab: SettingsTabKey }) {
  switch (activeTab) {
    case "general":
      return <SettingsGeneral />;
    case "calendar":
      return <SettingsCalendar />;
    case "transcription":
      return <STT />;
    case "intelligence":
      return <LLM />;
    case "notifications":
      return <SettingsNotifications />;
    case "account":
      return <SettingsAccount />;
    default:
      return null;
  }
}
