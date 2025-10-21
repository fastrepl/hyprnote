import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useRouteContext } from "@tanstack/react-router";
import { ArrowLeftIcon, ArrowRightIcon, PanelLeftOpenIcon, PlusIcon } from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

import { useShell } from "../../../contexts/shell";
import { type Tab, uniqueIdfromTab, useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";
import { ChatFloatingButton } from "../../chat";
import { TabContentCalendar, TabItemCalendar } from "./calendars";
import { TabContentContact, TabItemContact } from "./contacts";
import { TabContentEvent, TabItemEvent } from "./events";
import { TabContentFolder, TabItemFolder } from "./folders";
import { TabContentHuman, TabItemHuman } from "./humans";
import { Search } from "./search";
import { TabContentNote, TabItemNote } from "./sessions";

export function Body() {
  const { tabs, currentTab } = useTabs();

  if (!currentTab) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 h-full flex-1 relative">
      <Header tabs={tabs} />
      <div className="flex-1 overflow-auto">
        <ContentWrapper tab={currentTab} />
      </div>
    </div>
  );
}

function Header({ tabs }: { tabs: Tab[] }) {
  const { persistedStore, internalStore } = useRouteContext({ from: "__root__" });

  const { leftsidebar } = useShell();
  const { select, close, reorder, openNew, goBack, goNext, canGoBack, canGoNext, closeOthers, closeAll } = useTabs();
  const tabsScrollContainerRef = useRef<HTMLDivElement>(null);
  const setTabRef = useScrollActiveTabIntoView(tabs);

  const handleNewNote = useCallback(() => {
    const sessionId = id();
    const user_id = internalStore?.getValue("user_id");

    persistedStore?.setRow("sessions", sessionId, { user_id, created_at: new Date().toISOString(), title: "" });
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
        "w-full h-9 flex items-center",
        !leftsidebar.expanded && "pl-[72px]",
      ])}
    >
      {!leftsidebar.expanded && (
        <Button size="icon" variant="ghost" onClick={() => leftsidebar.setExpanded(true)}>
          <PanelLeftOpenIcon
            size={16}
          />
        </Button>
      )}

      <div className="flex items-center h-full shrink-0">
        <Button
          onClick={goBack}
          disabled={!canGoBack}
          variant="ghost"
          size="icon"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <Button
          onClick={goNext}
          disabled={!canGoNext}
          variant="ghost"
          size="icon"
        >
          <ArrowRightIcon size={16} />
        </Button>
      </div>

      <div
        ref={tabsScrollContainerRef}
        data-tauri-drag-region
        className={cn([
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          "w-fit overflow-x-auto overflow-y-hidden h-full",
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
              <TabItem
                tab={tab}
                handleClose={close}
                handleSelect={select}
                handleCloseOthersCallback={closeOthers}
                handleCloseAll={closeAll}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      <div
        data-tauri-drag-region
        className="flex-1 flex h-full items-center justify-between"
      >
        <Button
          onClick={handleNewNote}
          variant="ghost"
          size="icon"
          className="text-neutral-500"
        >
          <PlusIcon size={16} />
        </Button>

        <Search />
      </div>
    </div>
  );
}

function TabItem(
  {
    tab,
    handleClose,
    handleSelect,
    handleCloseOthersCallback,
    handleCloseAll,
  }: {
    tab: Tab;
    handleClose: (tab: Tab) => void;
    handleSelect: (tab: Tab) => void;
    handleCloseOthersCallback: (tab: Tab) => void;
    handleCloseAll: () => void;
  },
) {
  const handleCloseOthers = () => handleCloseOthersCallback(tab);

  if (tab.type === "sessions") {
    return (
      <TabItemNote
        tab={tab}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "events") {
    return (
      <TabItemEvent
        tab={tab}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "folders") {
    return (
      <TabItemFolder
        tab={tab}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "humans") {
    return (
      <TabItemHuman
        tab={tab}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }

  if (tab.type === "calendars") {
    return (
      <TabItemCalendar
        tab={tab}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }
  if (tab.type === "contacts") {
    return (
      <TabItemContact
        tab={tab}
        handleCloseThis={handleClose}
        handleSelectThis={handleSelect}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
      />
    );
  }

  return null;
}

function ContentWrapper({ tab }: { tab: Tab }) {
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
  if (tab.type === "calendars") {
    return <TabContentCalendar tab={tab} />;
  }
  if (tab.type === "contacts") {
    return <TabContentContact tab={tab} />;
  }

  return null;
}

function TabChatButton() {
  const { chat } = useShell();

  if (chat.mode === "RightPanelOpen") {
    return null;
  }

  return <ChatFloatingButton />;
}

export function StandardTabWrapper(
  { children, afterBorder }: { children: React.ReactNode; afterBorder?: React.ReactNode },
) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col rounded-lg border flex-1 overflow-hidden relative">
        {children}
        <TabChatButton />
      </div>
      {afterBorder}
    </div>
  );
}

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
