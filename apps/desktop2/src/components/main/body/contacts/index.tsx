import { Contact2Icon } from "lucide-react";

import * as persisted from "../../../../store/tinybase/persisted";
import { type Tab } from "../../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "../shared";

export const TabItemContact: TabItem = ({ tab, handleClose, handleSelect }) => {
  return (
    <TabItemBase
      icon={<Contact2Icon className="w-4 h-4" />}
      title={"Contacts"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentContact({ tab }: { tab: Tab }) {
  if (tab.type !== "contacts") {
    return null;
  }

  const organizations = persisted.UI.useResultTable(persisted.QUERIES.visibleOrganizations);
  return <pre>{JSON.stringify(organizations, null, 2)}</pre>;
}
