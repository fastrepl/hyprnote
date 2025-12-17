import { CalendarDays } from "lucide-react";

import { type Tab } from "../../../../store/zustand/tabs";
import { SettingsCalendar } from "../../../settings/calendar";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";

export const TabItemCalendar: TabItem<Extract<Tab, { type: "calendar" }>> = ({
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
      icon={<CalendarDays className="w-4 h-4" />}
      title={"Calendar"}
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

export function TabContentCalendar() {
  return (
    <StandardTabWrapper>
      <div className="flex-1 w-full overflow-y-auto scrollbar-hide p-6">
        <SettingsCalendar />
      </div>
    </StandardTabWrapper>
  );
}
