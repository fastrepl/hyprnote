import { UserIcon } from "lucide-react";

import * as persisted from "../../../store/tinybase/persisted";
import { type Tab } from "../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemHuman: TabItem = ({ tab, handleClose, handleSelect }) => {
  if (tab.type !== "humans") {
    throw new Error("non_human_tab");
  }

  const title = persisted.UI.useCell("humans", tab.id, "name", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<UserIcon className="w-4 h-4" />}
      title={title ?? "Human"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentHuman({ tab }: { tab: Tab }) {
  if (tab.type !== "humans") {
    throw new Error("non_human_tab");
  }

  return <div>Human</div>;
}
