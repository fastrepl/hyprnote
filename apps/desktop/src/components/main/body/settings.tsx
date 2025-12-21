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
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<SettingsIcon className="w-4 h-4" />}
      title={"Settings"}
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
