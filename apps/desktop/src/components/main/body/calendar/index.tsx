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
  handleTogglePin,
}) => {
  return (
    <TabItemBase
      icon={<CalendarDays className="w-4 h-4" />}
      title={"Calendar"}
      selected={tab.active}
      tabIndex={tabIndex}
      pinned={tab.pinned}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handleTogglePin={handleTogglePin}
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
