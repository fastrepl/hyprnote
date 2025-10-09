import clsx from "clsx";
import { Reorder } from "motion/react";

import { type Tab, uniqueIdfromTab, useTabs } from "../../../store/zustand/tabs";

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

function TabsHeader({ tabs }: { tabs: Tab[] }) {
  const { select, close, reorder } = useTabs();

  return (
    <div
      data-tauri-drag-region
      className={clsx([
        "w-full border-b overflow-x-auto h-11",
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
      ])}
    >
      <Reorder.Group
        as="div"
        axis="x"
        values={tabs}
        onReorder={reorder}
        className="flex w-max gap-1 h-full items-end"
        layoutScroll
      >
        {tabs.map((tab) => (
          <Reorder.Item
            key={uniqueIdfromTab(tab)}
            value={tab}
            as="div"
            style={{ position: "relative" }}
            className="h-full border-r border-t"
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
