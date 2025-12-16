import { UserIcon } from "lucide-react";

import * as main from "../../../store/tinybase/main";
import { type Tab } from "../../../store/zustand/tabs";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemHuman: TabItem<Extract<Tab, { type: "humans" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  const title = main.UI.useCell("humans", tab.id, "name", main.STORE_ID);

  return (
    <TabItemBase
      icon={<UserIcon className="w-4 h-4" />}
      title={title ?? "Human"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentHuman({
  tab: _,
}: {
  tab: Extract<Tab, { type: "humans" }>;
}) {
  return (
    <StandardTabWrapper>
      <div>Human</div>
    </StandardTabWrapper>
  );
}
