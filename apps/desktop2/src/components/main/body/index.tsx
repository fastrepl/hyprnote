import clsx from "clsx";
import { PanelLeftOpenIcon } from "lucide-react";
import { Reorder } from "motion/react";

import { type Tab, uniqueIdfromTab, useTabs } from "../../../store/zustand/tabs";

import { useLeftSidebar } from "@hypr/utils/contexts";
import { TabContentCalendar, TabItemCalendar } from "./calendars";
import { TabContentContact, TabItemContact } from "./contacts";
import { TabContentEvent, TabItemEvent } from "./events";
import { TabContentFolder, TabItemFolder } from "./folders";
import { TabContentHuman, TabItemHuman } from "./humans";
import { TabContentNote, TabItemNote } from "./sessions";

export function Body() {
  const { tabs, currentTab } = useTabs();

  if (!currentTab) {
    return null;
  }

  return (
    <div className="flex flex-col p-1 gap-2">
      <Header tabs={tabs} />
      <Content tab={currentTab} />
    </div>
  );
}

function Header({ tabs }: { tabs: Tab[] }) {
  const { isExpanded, setIsExpanded } = useLeftSidebar();
  const { select, close, reorder } = useTabs();

  return (
    <div
      data-tauri-drag-region
      className={clsx([
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        "w-full overflow-x-auto h-11",
        !isExpanded && "pl-[72px]",
      ])}
    >
      <div className="flex w-max h-full items-end">
        {!isExpanded && (
          <div className="flex items-center justify-center h-full px-3 sticky left-0 bg-white z-20">
            <PanelLeftOpenIcon
              className="h-5 w-5 cursor-pointer"
              onClick={() => setIsExpanded(true)}
            />
          </div>
        )}

        <Reorder.Group
          key={isExpanded ? "expanded" : "collapsed"}
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

  if (tab.type === "calendars") {
    return <TabContentCalendar tab={tab} />;
  }
  if (tab.type === "contacts") {
    return <TabContentContact tab={tab} />;
  }

  return null;
}
