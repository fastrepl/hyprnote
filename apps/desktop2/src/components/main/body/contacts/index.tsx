import { Contact2Icon } from "lucide-react";

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

  const {
    selectedOrganization,
    selectedPerson,
    editingPerson,
    editingOrg,
    showNewOrg,
    sortOption,
    orgSortOption,
  } = tab.state;

  const setSelectedOrganization = (value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, selectedOrganization: value });
  };

  const setSelectedPerson = (value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, selectedPerson: value });
  };

  const setEditingPerson = (value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, editingPerson: value });
  };

  const setEditingOrg = (value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, editingOrg: value });
  };

  const setShowNewOrg = (value: boolean) => {
    updateContactsTabState(tab, { ...tab.state, showNewOrg: value });
  };

  const setSortOption = (value: "alphabetical" | "oldest" | "newest") => {
    updateContactsTabState(tab, { ...tab.state, sortOption: value });
  };

  const setOrgSortOption = (value: "alphabetical" | "oldest" | "newest") => {
    updateContactsTabState(tab, { ...tab.state, orgSortOption: value });
  };

  const handleSessionClick = (_sessionId: string) => {
    openNew({ type: "sessions", id: _sessionId, active: true, state: { editor: "raw" } });
  };

  const handleEditPerson = (personId: string) => {
    setEditingPerson(personId);
  };

  const handleEditOrganization = (organizationId: string) => {
    setEditingOrg(organizationId);
  };

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
        showNewOrg={showNewOrg}
        setShowNewOrg={setShowNewOrg}
        editingOrg={editingOrg}
        setEditingOrg={setEditingOrg}
        handleEditOrganization={handleEditOrganization}
        sortOption={orgSortOption}
        setSortOption={setOrgSortOption}
      />

      <PeopleColumn
        currentOrgId={selectedOrganization}
        currentHumanId={selectedPerson}
        setSelectedPerson={setSelectedPerson}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />

      <DetailsColumn
        selectedHumanId={selectedPerson}
        isEditing={editingPerson === selectedPerson}
        setEditingPerson={setEditingPerson}
        handleEditPerson={handleEditPerson}
        handleDeletePerson={handleDeletePerson}
        handleSessionClick={handleSessionClick}
      />
    </div>
  );
}
