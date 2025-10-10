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

  const { selectedOrganization, selectedPerson, editingPerson, editingOrg, showNewOrg, sortOption } = tab.state;

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

  const organizationsData = persisted.UI.useResultTable(persisted.QUERIES.visibleOrganizations, persisted.STORE_ID);
  const humansData = persisted.UI.useResultTable(persisted.QUERIES.visibleHumans, persisted.STORE_ID);
  const selectedPersonData = persisted.UI.useRow("humans", selectedPerson ?? "", persisted.STORE_ID);

  // Get humans by organization if one is selected
  const humanIdsByOrg = persisted.UI.useSliceRowIds(
    persisted.INDEXES.humansByOrg,
    selectedOrganization ?? "",
    persisted.STORE_ID,
  );

  // Convert to arrays for rendering
  const organizations = Object.entries(organizationsData).map(([id, data]) => ({
    id,
    ...(data as any),
  }));

  const allHumans = Object.entries(humansData).map(([id, data]) => ({
    id,
    ...(data as any),
  }));

  // Filter humans by organization if selected
  const displayPeople = selectedOrganization
    ? allHumans.filter(h => humanIdsByOrg.includes(h.id))
    : allHumans;

  // Sort people based on selected option
  const sortedPeople = [...displayPeople].sort((a: any, b: any) => {
    if (sortOption === "alphabetical") {
      return (a.name || a.email || "").localeCompare(b.name || b.email || "");
    } else if (sortOption === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  // Get sessions - for now just an empty array, we'll implement this later
  const personSessions: any[] = [];

  const handleSessionClick = (_sessionId: string) => {
    // Handle session click
  };

  const handleEditPerson = (personId: string) => {
    setEditingPerson(personId);
  };

  const handleEditOrganization = (organizationId: string) => {
    setEditingOrg(organizationId);
  };

  const handleDeletePerson = async (_personId: string) => {
    // Handle delete person
  };

  const getInitials = (name: string | null) => {
    if (!name) {
      return "?";
    }
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full rounded-lg border">
      <OrganizationsColumn
        selectedOrganization={selectedOrganization}
        setSelectedOrganization={setSelectedOrganization}
        showNewOrg={showNewOrg}
        setShowNewOrg={setShowNewOrg}
        editingOrg={editingOrg}
        setEditingOrg={setEditingOrg}
        organizations={organizations}
        handleEditOrganization={handleEditOrganization}
      />

      <PeopleColumn
        displayPeople={sortedPeople}
        selectedPerson={selectedPerson}
        setSelectedPerson={setSelectedPerson}
        sortOption={sortOption}
        setSortOption={setSortOption}
        getInitials={getInitials}
      />

      <DetailsColumn
        selectedPersonData={selectedPersonData}
        editingPerson={editingPerson}
        setEditingPerson={setEditingPerson}
        organizations={organizations}
        personSessions={personSessions}
        handleEditPerson={handleEditPerson}
        handleDeletePerson={handleDeletePerson}
        handleSessionClick={handleSessionClick}
        getInitials={getInitials}
      />
    </div>
  );
}
