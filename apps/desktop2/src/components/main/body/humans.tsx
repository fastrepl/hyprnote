import { UserIcon } from "lucide-react";

import * as persisted from "../../../store/tinybase/persisted";
import { type Tab } from "../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemHuman: TabItem = ({
  tab,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  if (tab.type !== "humans") {
    throw new Error("non_human_tab");
  }

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

export function TabContentHuman({ tab }: { tab: Tab }) {
  if (tab.type !== "humans") {
    throw new Error("non_human_tab");
  }

  return <div>Human</div>;
}
