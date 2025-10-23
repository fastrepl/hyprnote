import { UserIcon } from "lucide-react";

import * as persisted from "../../../store/tinybase/persisted";
import { type Tab } from "../../../store/zustand/tabs";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemHuman: TabItem<Extract<Tab, { type: "humans" }>> = ({
  tab,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  const title = persisted.UI.useCell("humans", tab.id, "name", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<UserIcon className="w-4 h-4" />}
      title={title ?? "Human"}
      active={tab.active}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentHuman({ tab: _ }: { tab: Extract<Tab, { type: "humans" }> }) {
  return (
    <StandardTabWrapper>
      <div>Human</div>
    </StandardTabWrapper>
  );
}
