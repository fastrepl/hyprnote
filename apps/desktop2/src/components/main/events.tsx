import { CalendarIcon } from "lucide-react";

import * as persisted from "../../store/tinybase/persisted";
import { rowIdfromTab, type Tab } from "../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemEvent: TabItem = ({ tab, handleClose, handleSelect }) => {
  const title = persisted.UI.useCell("events", rowIdfromTab(tab), "title", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<CalendarIcon className="w-4 h-4" />}
      title={title ?? ""}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentEvent({ tab }: { tab: Tab }) {
  const id = rowIdfromTab(tab);
  const event = persisted.UI.useRow("events", id, persisted.STORE_ID);

  return <pre>{JSON.stringify(event, null, 2)}</pre>;
}
