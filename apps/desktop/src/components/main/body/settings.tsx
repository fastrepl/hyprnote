import {
  BellIcon,
  FlaskConical,
  LanguagesIcon,
  LockIcon,
  MicIcon,
  SettingsIcon,
  SmartphoneIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  ScrollFadeOverlay,
  useScrollFade,
} from "@hypr/ui/components/ui/scroll-fade";
import { cn } from "@hypr/utils";

import { type Tab } from "../../../store/zustand/tabs";
import { SettingsGeneral } from "../../settings/general";
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
  tab: _tab,
}: {
  tab: Extract<Tab, { type: "settings" }>;
}) {
  return (
    <StandardTabWrapper>
      <SettingsView />
    </StandardTabWrapper>
  );
}

type SettingsSection =
  | "app"
  | "language"
  | "notifications"
  | "permissions"
  | "audio"
  | "lab";

const SECTIONS: {
  id: SettingsSection;
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

function SettingsView() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<SettingsSection, HTMLDivElement | null>());
  const [activeSection, setActiveSection] = useState<SettingsSection>("app");
  const isProgrammaticScroll = useRef(false);
  const { atStart, atEnd } = useScrollFade(scrollContainerRef, "vertical", [
    activeSection,
  ]);

  const refCallbacks = useMemo(
    () => ({
      app: (el: HTMLDivElement | null) => {
        sectionRefs.current.set("app", el);
      },
      language: (el: HTMLDivElement | null) => {
        sectionRefs.current.set("language", el);
      },
      notifications: (el: HTMLDivElement | null) => {
        sectionRefs.current.set("notifications", el);
      },
      permissions: (el: HTMLDivElement | null) => {
        sectionRefs.current.set("permissions", el);
      },
      audio: (el: HTMLDivElement | null) => {
        sectionRefs.current.set("audio", el);
      },
      lab: (el: HTMLDivElement | null) => {
        sectionRefs.current.set("lab", el);
      },
    }),
    [],
  );

  const scrollToSection = useCallback((section: SettingsSection) => {
    setActiveSection(section);
    isProgrammaticScroll.current = true;

    const container = scrollContainerRef.current;
    if (!container) return;

    if (section === "lab") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      const target = sectionRefs.current.get(section);
      if (target) {
        const containerTop = container.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        const offset = targetTop - containerTop + container.scrollTop - 24;
        container.scrollTo({ top: offset, behavior: "smooth" });
      }
    }

    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 1000);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScroll.current) return;

      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerBottom = containerRect.bottom;

      let maxVisibleArea = 0;
      let mostVisibleSection: SettingsSection | null = null;

      for (const { id } of SECTIONS) {
        const el = sectionRefs.current.get(id);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, containerTop);
        const visibleBottom = Math.min(rect.bottom, containerBottom);
        const visibleArea = Math.max(0, visibleBottom - visibleTop);

        if (visibleArea > maxVisibleArea) {
          maxVisibleArea = visibleArea;
          mostVisibleSection = id;
        }
      }

      if (mostVisibleSection) {
        setActiveSection(mostVisibleSection);
      }
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const tabsRef = useRef<HTMLDivElement>(null);
  const { atStart: tabsAtStart, atEnd: tabsAtEnd } = useScrollFade(
    tabsRef,
    "horizontal",
  );

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      <div className="relative pt-6 pb-2">
        <div
          ref={tabsRef}
          className="flex gap-1 px-6 overflow-x-auto scrollbar-hide"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              onClick={() => scrollToSection(id)}
              className={cn([
                "px-1 gap-1.5 h-7 border border-transparent shrink-0",
                id === "lab" && "ml-2 text-neutral-500",
                activeSection === id &&
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
        {!tabsAtStart && <ScrollFadeOverlay position="left" />}
        {!tabsAtEnd && <ScrollFadeOverlay position="right" />}
      </div>
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 w-full h-full overflow-y-auto scrollbar-hide px-6 pb-6"
        >
          <SettingsGeneral
            appRef={refCallbacks.app}
            languageRef={refCallbacks.language}
            notificationsRef={refCallbacks.notifications}
            permissionsRef={refCallbacks.permissions}
            audioRef={refCallbacks.audio}
            activeSection={activeSection}
          />

          <div className="border-t border-dashed border-neutral-200 mt-10 pt-8">
            <div ref={refCallbacks.lab}>
              <h2 className="text-lg font-semibold mb-4 text-neutral-600">
                Lab
              </h2>
              <SettingsLab />
            </div>
          </div>
        </div>
        {!atStart && <ScrollFadeOverlay position="top" />}
        {!atEnd && <ScrollFadeOverlay position="bottom" />}
      </div>
    </div>
  );
}
