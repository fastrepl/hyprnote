import {
  BellIcon,
  FlaskConical,
  LanguagesIcon,
  LockIcon,
  SettingsIcon,
  SmartphoneIcon,
} from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useResizeObserver } from "usehooks-ts";

import { Button } from "@hypr/ui/components/ui/button";
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
  | "lab";

function SettingsView() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const permissionsRef = useRef<HTMLDivElement>(null);
  const labRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>("app");
  const {
    ref: scrollFadeRef,
    atStart,
    atEnd,
  } = useScrollFade<HTMLDivElement>([activeSection]);

  const scrollToSection = useCallback((section: SettingsSection) => {
    setActiveSection(section);

    const container = scrollContainerRef.current;
    const refMap = {
      app: appRef,
      language: languageRef,
      notifications: notificationsRef,
      permissions: permissionsRef,
      lab: labRef,
    };
    const targetRef = refMap[section];
    const target = targetRef.current;

    if (container && target) {
      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const offset = targetTop - containerTop + container.scrollTop - 24;

      container.scrollTo({
        top: offset,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const refs = [
        { section: "app" as const, ref: appRef },
        { section: "language" as const, ref: languageRef },
        { section: "notifications" as const, ref: notificationsRef },
        { section: "permissions" as const, ref: permissionsRef },
        { section: "lab" as const, ref: labRef },
      ];

      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;

      let activeSection: SettingsSection | null = null;

      for (const { section, ref } of refs) {
        const el = ref.current;
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const sectionTop = rect.top;
        const sectionBottom = rect.bottom;
        const sectionCenter = sectionTop + rect.height / 2;

        if (sectionCenter <= containerCenter) {
          activeSection = section;
        }
      }

      if (activeSection) {
        setActiveSection(activeSection);
      }
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      (scrollFadeRef as React.MutableRefObject<HTMLDivElement | null>).current =
        scrollContainerRef.current;
    }
  }, [scrollFadeRef]);

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      <div className="flex gap-1 px-6 pt-6 pb-2 overflow-x-auto scrollbar-hide">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToSection("app")}
          className={cn([
            "px-1 gap-1.5 h-7 border border-transparent flex-shrink-0",
            activeSection === "app" && "bg-neutral-100 border-neutral-200",
          ])}
        >
          <SmartphoneIcon size={14} />
          <span className="text-xs">App</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToSection("language")}
          className={cn([
            "px-1 gap-1.5 h-7 border border-transparent flex-shrink-0",
            activeSection === "language" && "bg-neutral-100 border-neutral-200",
          ])}
        >
          <LanguagesIcon size={14} />
          <span className="text-xs">Language</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToSection("notifications")}
          className={cn([
            "px-1 gap-1.5 h-7 border border-transparent flex-shrink-0",
            activeSection === "notifications" &&
              "bg-neutral-100 border-neutral-200",
          ])}
        >
          <BellIcon size={14} />
          <span className="text-xs">Notifications</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToSection("permissions")}
          className={cn([
            "px-1 gap-1.5 h-7 border border-transparent flex-shrink-0",
            activeSection === "permissions" &&
              "bg-neutral-100 border-neutral-200",
          ])}
        >
          <LockIcon size={14} />
          <span className="text-xs">Permissions</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToSection("lab")}
          className={cn([
            "px-1 gap-1.5 h-7 border border-transparent flex-shrink-0",
            activeSection === "lab" && "bg-neutral-100 border-neutral-200",
          ])}
        >
          <FlaskConical size={14} />
          <span className="text-xs">Lab</span>
        </Button>
      </div>
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 w-full h-full overflow-y-auto scrollbar-hide px-6 pb-6"
        >
          <SettingsGeneral
            appRef={appRef}
            languageRef={languageRef}
            notificationsRef={notificationsRef}
            permissionsRef={permissionsRef}
            activeSection={activeSection}
          />

          <div ref={labRef} className="mt-8">
            <h2 className="font-semibold mb-4">Lab</h2>
            <SettingsLab />
          </div>
        </div>
        {!atStart && <ScrollFadeOverlay position="top" />}
        {!atEnd && <ScrollFadeOverlay position="bottom" />}
      </div>
    </div>
  );
}

function useScrollFade<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const [state, setState] = useState({ atStart: true, atEnd: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setState({
      atStart: scrollTop <= 1,
      atEnd: scrollTop + clientHeight >= scrollHeight - 1,
    });
  }, []);

  useResizeObserver({ ref, onResize: update });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update);
    return () => el.removeEventListener("scroll", update);
  }, [update, ...deps]);

  return { ref, ...state };
}

function ScrollFadeOverlay({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={cn([
        "absolute left-0 w-full h-8 z-20 pointer-events-none",
        position === "top" &&
          "top-0 bg-gradient-to-b from-white to-transparent",
        position === "bottom" &&
          "bottom-0 bg-gradient-to-t from-white to-transparent",
      ])}
    />
  );
}
