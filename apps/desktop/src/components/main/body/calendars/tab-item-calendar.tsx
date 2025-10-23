import { Calendar } from "lucide-react";

import { type Tab } from "../../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "../shared";

export const TabItemCalendar: TabItem<Extract<Tab, { type: "calendars" }>> = (
  {
    tab,
    tabIndex,
    handleCloseThis,
    handleSelectThis,
    handleCloseOthers,
    handleCloseAll,
  },
) => {
  return (
    <TabItemBase
      icon={<Calendar size={16} />}
      title={"Calendar"}
      active={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};
