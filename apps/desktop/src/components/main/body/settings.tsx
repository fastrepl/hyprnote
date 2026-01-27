import {
  BellIcon,
  FlaskConical,
  LanguagesIcon,
  LockIcon,
  MicIcon,
  SettingsIcon,
  SmartphoneIcon,
} from "lucide-react";
import { useCallback, useRef } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  ScrollFadeOverlay,
  useScrollFade,
} from "@hypr/ui/components/ui/scroll-fade";
import { cn } from "@hypr/utils";

import {
  type SettingsTab,
  type Tab,
  useTabs,
} from "../../../store/zustand/tabs";
import {
  SettingsApp,
  SettingsAudio,
  SettingsLanguage,
  SettingsNotifications,
  SettingsPermissions,
} from "../../settings/general";
import { SettingsLab } from "../../settings/lab";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemSettings: TabItem<Extract<Tab, { type: "settings" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<SettingsIcon className="w-4 h-4" />}
      title={"Settings"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
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

const SECTIONS: {
  id: SettingsTab;
  label: string;
  icon: typeof SmartphoneIcon;
}[] = [
  { id: "app", label: "App", icon: SmartphoneIcon },
  { id: "language", label: "Language", icon: LanguagesIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "permissions", label: "Permissions", icon: LockIcon },
  { id: "audio", label: "Audio", icon: MicIcon },
  { id: "lab", label: "Lab", icon: FlaskConical },
];

function SettingsView({ tab }: { tab: Extract<Tab, { type: "settings" }> }) {
  const updateSettingsTabState = useTabs(
    (state) => state.updateSettingsTabState,
  );
  const activeTab = tab.state.tab ?? "app";
  const ref = useRef<HTMLDivElement>(null);
  const { atStart, atEnd } = useScrollFade(ref, "vertical", [activeTab]);

  const setActiveTab = useCallback(
    (newTab: SettingsTab) => {
      updateSettingsTabState(tab, { tab: newTab });
    },
    [updateSettingsTabState, tab],
  );

  const renderContent = () => {
    switch (activeTab) {
      case "app":
        return <SettingsApp />;
      case "language":
        return <SettingsLanguage />;
      case "notifications":
        return <SettingsNotifications />;
      case "permissions":
        return <SettingsPermissions />;
      case "audio":
        return <SettingsAudio />;
      case "lab":
        return <SettingsLab />;
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      <div className="flex gap-1 px-6 pt-6 pb-2">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(id)}
            className={cn([
              "px-1 gap-1.5 h-7 border border-transparent shrink-0",
              id === "lab" && "ml-2 text-neutral-500",
              activeTab === id &&
                (id === "lab"
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-neutral-100 border-neutral-200"),
            ])}
          >
            <Icon size={14} />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          ref={ref}
          className="flex-1 w-full h-full overflow-y-auto scrollbar-hide px-6 pb-6"
        >
          {renderContent()}
        </div>
        {!atStart && <ScrollFadeOverlay position="top" />}
        {!atEnd && <ScrollFadeOverlay position="bottom" />}
      </div>
    </div>
  );
}
