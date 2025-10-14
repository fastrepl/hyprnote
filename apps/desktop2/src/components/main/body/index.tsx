import { useRouteContext } from "@tanstack/react-router";
import { ArrowLeftIcon, ArrowRightIcon, PanelLeftOpenIcon, PlusIcon } from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@hypr/ui/lib/utils";
import { useShell } from "../../../contexts/shell";
import { type Tab, uniqueIdfromTab, useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";
import { scrollTabsToEnd, setTabsScrollContainer } from "../../../utils/tabs-scroll";
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
  const { select, close, reorder, openNew } = useTabs();
  const tabsScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTabsScrollContainer(tabsScrollContainerRef.current);
    return () => setTabsScrollContainer(null);
  }, []);

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

    scrollTabsToEnd();
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
          className={cn([
            "flex items-center justify-center",
            "h-full",
            "px-1.5",
            "rounded-lg",
            "hover:bg-gray-50",
            "transition-colors",
            "group",
          ])}
        >
          <ArrowLeftIcon className="h-4 w-4 text-color3 cursor-pointer group-hover:text-black" />
        </button>
        <button
          className={cn([
            "flex items-center justify-center",
            "h-full",
            "px-1.5",
            "rounded-lg",
            "hover:bg-gray-50",
            "transition-colors",
            "group",
          ])}
        >
          <ArrowRightIcon className="h-4 w-4 text-color3 cursor-pointer group-hover:text-black" />
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
