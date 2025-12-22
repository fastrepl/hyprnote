import { SettingsIcon } from "lucide-react";

import { type Tab } from "../../../store/zustand/tabs";
import { SettingsGeneral } from "../../settings/general";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemSettings: TabItem<Extract<Tab, { type: "settings" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<SettingsIcon className="w-4 h-4" />}
      title={"App Settings"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentSettings({
  tab: _tab,
}: {
  tab: Extract<Tab, { type: "settings" }>;
}) {
  return (
    <StandardTabWrapper>
      <div className="flex-1 w-full overflow-y-auto scrollbar-hide p-6">
        <SettingsGeneral />
      </div>
    </StandardTabWrapper>
  );
}
