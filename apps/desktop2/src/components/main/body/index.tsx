import { useRouteContext } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ArrowLeftIcon, ArrowRightIcon, PanelLeftOpenIcon, PlusIcon } from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/ui/lib/utils";
import { useShell } from "../../../contexts/shell";
import { type Tab, uniqueIdfromTab, useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";
import { ChatFloatingButton } from "../../chat";
import { TabContentCalendar, TabItemCalendar } from "./calendars";
import { TabContentContact, TabItemContact } from "./contacts";
import { TabContentDaily, TabItemDaily } from "./daily";
import { TabContentEvent, TabItemEvent } from "./events";
import { TabContentFolder, TabItemFolder } from "./folders";
import { TabContentHuman, TabItemHuman } from "./humans";
import { Search } from "./search";
import { TabContentNote, TabItemNote } from "./sessions";

export function Body() {
  const { tabs, currentTab } = useTabs();
  const { chat } = useShell();

  useTabCloseHotkey();

  if (!currentTab) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 h-full flex-1 relative">
      <Header tabs={tabs} />
      <div className="flex-1 overflow-auto">
        <Content tab={currentTab} />
      </div>
      {chat.mode !== "RightPanelOpen" && <ChatFloatingButton />}
    </div>
  );
}

function Header({ tabs }: { tabs: Tab[] }) {
  const { persistedStore, internalStore } = useRouteContext({ from: "__root__" });

  const { leftsidebar } = useShell();
  const { select, close, reorder, openNew, goBack, goNext, canGoBack, canGoNext } = useTabs();
  const tabsScrollContainerRef = useRef<HTMLDivElement>(null);
  const setTabRef = useScrollActiveTabIntoView(tabs);

  const handleNewNote = useCallback(() => {
    const sessionId = id();
    const user_id = internalStore?.getValue("user_id");

    persistedStore?.setRow("sessions", sessionId, { user_id, created_at: new Date().toISOString() });
    openNew({
      type: "sessions",
      id: sessionId,
      active: true,
      state: { editor: "raw" },
    });
  }, [persistedStore, internalStore, openNew]);

  return (
    <div
      className={cn([
        "w-full h-9 flex items-end",
        !leftsidebar.expanded && "pl-[72px]",
      ])}
    >
      {!leftsidebar.expanded && (
        <div className="flex items-center justify-center h-full px-3 shrink-0 bg-white z-20">
          <PanelLeftOpenIcon
            className="h-5 w-5 cursor-pointer"
            onClick={() => leftsidebar.setExpanded(true)}
          />
        </div>
      )}

      <div className="flex items-center h-full shrink-0">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className={cn([
            "flex items-center justify-center",
            "h-full",
            "px-1.5",
            "rounded-lg",
            "transition-colors",
            canGoBack && ["hover:bg-gray-50", "group"],
            !canGoBack && "cursor-not-allowed",
          ])}
        >
          <ArrowLeftIcon
            className={cn([
              "h-4 w-4",
              canGoBack && ["text-black/70", "cursor-pointer", "group-hover:text-black"],
              !canGoBack && ["text-black/30", "cursor-not-allowed"],
            ])}
          />
        </button>
        <button
          onClick={goNext}
          disabled={!canGoNext}
          className={cn([
            "flex items-center justify-center",
            "h-full",
            "px-1.5",
            "rounded-lg",
            "transition-colors",
            canGoNext && ["hover:bg-gray-50", "group"],
            !canGoNext && "cursor-not-allowed",
          ])}
        >
          <ArrowRightIcon
            className={cn([
              "h-4 w-4",
              canGoNext && ["text-black/70", "cursor-pointer", "group-hover:text-black"],
              !canGoNext && ["text-black/30", "cursor-not-allowed"],
            ])}
          />
        </button>
      </div>

      <div
        ref={tabsScrollContainerRef}
        data-tauri-drag-region
        className={cn([
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          "flex-1 min-w-0 overflow-x-auto overflow-y-hidden h-full",
        ])}
      >
        <Reorder.Group
          key={leftsidebar.expanded ? "expanded" : "collapsed"}
          as="div"
          axis="x"
          values={tabs}
          onReorder={reorder}
          className="flex w-max gap-1 h-full"
        >
          {tabs.map((tab) => (
            <Reorder.Item
              key={uniqueIdfromTab(tab)}
              value={tab}
              as="div"
              ref={(el) => setTabRef(tab, el)}
              style={{ position: "relative" }}
              className="h-full z-10"
              layoutScroll
            >
              <TabItem tab={tab} handleClose={close} handleSelect={select} />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      <button
        onClick={handleNewNote}
        className={cn([
          "flex items-center justify-center",
          "h-full",
          "px-1.5",
          "rounded-lg",
          "bg-white hover:bg-gray-50",
          "transition-colors",
          "shrink-0",
        ])}
      >
        <PlusIcon className="h-4 w-4 text-color3 cursor-pointer" />
      </button>

      <Search />
    </div>
  );
}

function TabItem(
  { tab, handleClose, handleSelect }: { tab: Tab; handleClose: (tab: Tab) => void; handleSelect: (tab: Tab) => void },
) {
  if (tab.type === "sessions") {
    return <TabItemNote tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }
  if (tab.type === "events") {
    return <TabItemEvent tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }
  if (tab.type === "folders") {
    return <TabItemFolder tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }
  if (tab.type === "humans") {
    return <TabItemHuman tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }
  if (tab.type === "daily") {
    return <TabItemDaily tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  if (tab.type === "calendars") {
    return <TabItemCalendar tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }
  if (tab.type === "contacts") {
    return <TabItemContact tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  return null;
}

function Content({ tab }: { tab: Tab }) {
  if (tab.type === "sessions") {
    return <TabContentNote tab={tab} />;
  }
  if (tab.type === "events") {
    return <TabContentEvent tab={tab} />;
  }
  if (tab.type === "folders") {
    return <TabContentFolder tab={tab} />;
  }
  if (tab.type === "humans") {
    return <TabContentHuman tab={tab} />;
  }
  if (tab.type === "daily") {
    return <TabContentDaily tab={tab} />;
  }

  if (tab.type === "calendars") {
    return <TabContentCalendar tab={tab} />;
  }
  if (tab.type === "contacts") {
    return <TabContentContact tab={tab} />;
  }

  return null;
}

const useTabCloseHotkey = () => {
  const { tabs, currentTab, close } = useTabs();

  useHotkeys(
    "mod+w",
    async (e) => {
      e.preventDefault();

      if (currentTab && tabs.length > 1) {
        close(currentTab);
      } else {
        const appWindow = getCurrentWebviewWindow();
        await appWindow.close();
      }
    },
    { enableOnFormTags: true },
    [tabs, currentTab, close],
  );
};

function useScrollActiveTabIntoView(tabs: Tab[]) {
  const tabRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const activeTab = tabs.find((tab) => tab.active);
    if (activeTab) {
      const tabKey = uniqueIdfromTab(activeTab);
      const tabElement = tabRefsMap.current.get(tabKey);
      if (tabElement) {
        tabElement.scrollIntoView({
          behavior: "smooth",
          inline: "nearest",
          block: "nearest",
        });
      }
    }
  }, [tabs]);

  const setTabRef = useCallback((tab: Tab, el: HTMLDivElement | null) => {
    if (el) {
      tabRefsMap.current.set(uniqueIdfromTab(tab), el);
    } else {
      tabRefsMap.current.delete(uniqueIdfromTab(tab));
    }
  }, []);

  return setTabRef;
}
