import { Contact2Icon } from "lucide-react";
import { useCallback } from "react";

import * as persisted from "../../../../store/tinybase/persisted";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "../shared";
import { DetailsColumn } from "./details";
import { OrganizationsColumn } from "./organizations";
import { PeopleColumn } from "./people";

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

  return (
    <div className="h-[calc(100vh-44px)]">
      <ContactView tab={tab} />
    </div>
  );
}

function ContactView({ tab }: { tab: Tab }) {
  if (tab.type !== "contacts") {
    return null;
  }

  const updateContactsTabState = useTabs((state) => state.updateContactsTabState);
  const { openNew } = useTabs();

  const { selectedOrganization, selectedPerson } = tab.state;

  const setSelectedOrganization = useCallback((value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, selectedOrganization: value });
  }, [updateContactsTabState, tab]);

  const setSelectedPerson = useCallback((value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, selectedPerson: value });
  }, [updateContactsTabState, tab]);

  const handleSessionClick = useCallback((id: string) => {
    openNew({ type: "sessions", id, active: true, state: { editor: "raw" } });
  }, [openNew]);

  const handleDeletePerson = persisted.UI.useDelRowCallback(
    "humans",
    (human_id: string) => human_id,
    persisted.STORE_ID,
  );

  return (
    <div className="flex h-full rounded-lg border">
      <OrganizationsColumn
        selectedOrganization={selectedOrganization}
        setSelectedOrganization={setSelectedOrganization}
      />
      <PeopleColumn
        currentOrgId={selectedOrganization}
        currentHumanId={selectedPerson}
        setSelectedPerson={setSelectedPerson}
      />
      <DetailsColumn
        selectedHumanId={selectedPerson}
        handleDeletePerson={handleDeletePerson}
        handleSessionClick={handleSessionClick}
      />
    </div>
  );
}
