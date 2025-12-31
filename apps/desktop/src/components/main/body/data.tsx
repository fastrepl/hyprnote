import { DatabaseIcon } from "lucide-react";

import { type Tab } from "../../../store/zustand/tabs";
import { Import } from "../../settings/data/import";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemData: TabItem<Extract<Tab, { type: "data" }>> = ({
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
      icon={<DatabaseIcon className="w-4 h-4" />}
      title="Import"
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

export function TabContentData(_props: {
  tab: Extract<Tab, { type: "data" }>;
}) {
  return (
    <StandardTabWrapper>
      <DataView />
    </StandardTabWrapper>
  );
}

function DataView() {
  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      <div className="flex-1 w-full overflow-y-auto scrollbar-hide px-6 pb-6 pt-6">
        <Import />
      </div>
    </div>
  );
}
