import { useRouteContext } from "@tanstack/react-router";
import { clsx } from "clsx";
import { CalendarIcon, CogIcon, FolderIcon, PanelLeftOpenIcon, PencilIcon } from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { useLeftSidebar } from "@hypr/utils/contexts";
import { type Tab, uniqueIdfromTab, useTabs } from "../../store/zustand/tabs";

import { TabContentCalendar, TabItemCalendar } from "./calendars";
import { TabContentEvent, TabItemEvent } from "./events";
import { TabContentFolder, TabItemFolder } from "./folders";
import { TabContentHuman, TabItemHuman } from "./humans";
import { TabContentNote, TabItemNote } from "./sessions";

export function MainContent() {
  const { tabs, currentTab } = useTabs();

  if (!currentTab) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <TabsHeader tabs={tabs} />
      <TabContent tab={currentTab} />
    </div>
  );
}

export function MainHeader() {
  const { persistedStore, internalStore } = useRouteContext({ from: "__root__" });
  const { isExpanded: isLeftPanelExpanded, togglePanel: toggleLeftPanel } = useLeftSidebar();
  const { openNew } = useTabs();

  const handleClickSettings = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" });
  }, []);

  const handleClickNewNote = useCallback(() => {
    if (!persistedStore || !internalStore) {
      return;
    }

    const sessionId = crypto.randomUUID();
    const user_id = internalStore.getValue("user_id");

    persistedStore.setRow("sessions", sessionId, {
      title: "new",
      user_id,
      created_at: new Date().toISOString(),
    });
    openNew({ id: sessionId, type: "sessions", active: true });
  }, [persistedStore, internalStore, openNew]);

  return (
    <header
      data-tauri-drag-region
      className={clsx([
        "flex w-full items-center justify-between min-h-11 py-1 px-2 border-b",
        "border-border bg-neutral-50",
        "pl-[82px]",
      ])}
    >
      {!isLeftPanelExpanded
        && (
          <PanelLeftOpenIcon
            onClick={toggleLeftPanel}
            className="cursor-pointer h-5 w-5"
          />
        )}

      <div
        className="flex items-center justify-start gap-2"
        data-tauri-drag-region
      >
        <CogIcon
          onClick={handleClickSettings}
          className="cursor-pointer h-5 w-5 text-muted-foreground hover:text-foreground"
        />

        <FolderIcon
          onClick={() => openNew({ type: "folders", id: null, active: true })}
          className="cursor-pointer h-5 w-5 text-muted-foreground hover:text-foreground"
        />
        <PencilIcon
          onClick={handleClickNewNote}
          className="cursor-pointer h-5 w-5 text-muted-foreground hover:text-foreground"
        />
        <CalendarIcon
          onClick={() => openNew({ type: "calendars", month: new Date(), active: true })}
          className="cursor-pointer h-5 w-5 text-muted-foreground hover:text-foreground"
        />
      </div>
    </header>
  );
}

function TabsHeader({ tabs }: { tabs: Tab[] }) {
  const { select, close, reorder } = useTabs();

  return (
    <div className="w-full border-b overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Reorder.Group
        as="div"
        axis="x"
        values={tabs}
        onReorder={reorder}
        className="flex w-max gap-1"
        layoutScroll
      >
        {tabs.map((tab) => (
          <Reorder.Item
            key={uniqueIdfromTab(tab)}
            value={tab}
            as="div"
            style={{ position: "relative" }}
          >
            <TabItem tab={tab} handleClose={close} handleSelect={select} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
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

  if (tab.type === "calendars") {
    return <TabItemCalendar tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }
  if (tab.type === "folders") {
    return <TabItemFolder tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  if (tab.type === "humans") {
    return <TabItemHuman tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  return null;
}

function TabContent({ tab }: { tab: Tab }) {
  if (tab.type === "sessions") {
    return <TabContentNote tab={tab} />;
  }

  if (tab.type === "events") {
    return <TabContentEvent tab={tab} />;
  }

  if (tab.type === "calendars") {
    return <TabContentCalendar tab={tab} />;
  }

  if (tab.type === "folders") {
    return <TabContentFolder tab={tab} />;
  }

  if (tab.type === "humans") {
    return <TabContentHuman tab={tab} />;
  }

  return null;
}
