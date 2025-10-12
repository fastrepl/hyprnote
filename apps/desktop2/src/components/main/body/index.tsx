import { PanelLeftOpenIcon } from "lucide-react";
import { Reorder } from "motion/react";

import { type Tab, uniqueIdfromTab, useTabs } from "../../../store/zustand/tabs";

import { cn } from "@hypr/ui/lib/utils";
import { useLeftSidebar } from "@hypr/utils/contexts";
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

  if (!currentTab) {
    return null;
  }

  return (
    <div className="flex flex-col p-1 gap-1 h-full relative">
      <Header tabs={tabs} />
      <div className="flex-1 overflow-auto">
        <Content tab={currentTab} />
      </div>
    </div>
  );
}

function Header({ tabs }: { tabs: Tab[] }) {
  const { isExpanded, setIsExpanded } = useLeftSidebar();
  const { select, close, reorder } = useTabs();

  return (
    <div
      className={cn([
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        "w-full overflow-x-auto h-8",
        !isExpanded && "pl-[72px]",
      ])}
    >
      <div className="flex w-full h-full items-end gap-4">
        <div data-tauri-drag-region className="flex items-end h-full flex-1 min-w-0">
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

        <Search />
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
