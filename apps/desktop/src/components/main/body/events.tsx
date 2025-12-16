import { CalendarIcon } from "lucide-react";

import * as main from "../../../store/tinybase/main";
import { rowIdfromTab, type Tab } from "../../../store/zustand/tabs";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemEvent: TabItem<Extract<Tab, { type: "events" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  const title = main.UI.useCell(
    "events",
    rowIdfromTab(tab),
    "title",
    main.STORE_ID,
  );

  return (
    <TabItemBase
      icon={<CalendarIcon className="w-4 h-4" />}
      title={title ?? ""}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentEvent({
  tab,
}: {
  tab: Extract<Tab, { type: "events" }>;
}) {
  const id = rowIdfromTab(tab);
  const event = main.UI.useRow("events", id, main.STORE_ID);

  return (
    <StandardTabWrapper>
      <pre>{JSON.stringify(event, null, 2)}</pre>
    </StandardTabWrapper>
  );
}
