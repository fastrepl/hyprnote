import { Contact2Icon } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/shallow";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import * as main from "../../../../store/tinybase/main";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { DetailsColumn } from "./details";
import { OrganizationDetailsColumn } from "./organization-details";
import { OrganizationsColumn } from "./organizations";
import { PeopleColumn, useSortedHumanIds } from "./people";

export const TabItemContact: TabItem<Extract<Tab, { type: "contacts" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<Contact2Icon className="w-4 h-4" />}
      title={"Contacts"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentContact({
  tab,
}: {
  tab: Extract<Tab, { type: "contacts" }>;
}) {
  return (
    <StandardTabWrapper>
      <ContactView tab={tab} />
    </StandardTabWrapper>
  );
}

function ContactView({ tab }: { tab: Extract<Tab, { type: "contacts" }> }) {
  const updateContactsTabState = useTabs(
    (state) => state.updateContactsTabState,
  );
  const { openCurrent, invalidateResource } = useTabs(
    useShallow((state) => ({
      openCurrent: state.openCurrent,
      invalidateResource: state.invalidateResource,
    })),
  );

  const { selectedOrganization, selectedPerson } = tab.state;

  const setSelectedOrganization = useCallback(
    (value: string | null) => {
      updateContactsTabState(tab, {
        ...tab.state,
        selectedOrganization: value,
        // Clear selected person when selecting an organization
        selectedPerson: value ? null : tab.state.selectedPerson,
      });
    },
    [updateContactsTabState, tab],
  );

  const setSelectedPerson = useCallback(
    (value: string | null) => {
      updateContactsTabState(tab, {
        ...tab.state,
        selectedPerson: value,
      });
    },
    [updateContactsTabState, tab],
  );

  const handleSessionClick = useCallback(
    (id: string) => {
      openCurrent({ type: "sessions", id });
    },
    [openCurrent],
  );

  const deletePersonFromStore = main.UI.useDelRowCallback(
    "humans",
    (human_id: string) => human_id,
    main.STORE_ID,
  );

  const handleDeletePerson = useCallback(
    (id: string) => {
      invalidateResource("humans", id);
      deletePersonFromStore(id);
    },
    [invalidateResource, deletePersonFromStore],
  );

  const deleteOrganizationFromStore = main.UI.useDelRowCallback(
    "organizations",
    (org_id: string) => org_id,
    main.STORE_ID,
  );

  const handleDeleteOrganization = useCallback(
    (id: string) => {
      invalidateResource("organizations" as const, id);
      deleteOrganizationFromStore(id);
    },
    [invalidateResource, deleteOrganizationFromStore],
  );

  // Get the list of humanIds to auto-select the first person (only when no org is selected)
  const { humanIds } = useSortedHumanIds(selectedOrganization);

  // Auto-select first person on load if no person is selected and no org is selected
  useEffect(() => {
    if (!selectedOrganization && !selectedPerson && humanIds.length > 0) {
      setSelectedPerson(humanIds[0]);
    }
  }, [humanIds, selectedPerson, selectedOrganization, setSelectedPerson]);

  const isViewingOrgDetails = selectedOrganization && !selectedPerson;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
        <OrganizationsColumn
          selectedOrganization={selectedOrganization}
          setSelectedOrganization={setSelectedOrganization}
          isViewingOrgDetails={!!isViewingOrgDetails}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <PeopleColumn
          currentOrgId={selectedOrganization}
          currentHumanId={selectedPerson}
          setSelectedPerson={setSelectedPerson}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={55} minSize={30}>
        {selectedOrganization && !selectedPerson ? (
          // Show organization details when org is selected but no person is selected
          <OrganizationDetailsColumn
            selectedOrganizationId={selectedOrganization}
            handleDeleteOrganization={handleDeleteOrganization}
            onPersonClick={setSelectedPerson}
          />
        ) : (
          // Show person details when a person is selected or no org is selected
          <DetailsColumn
            selectedHumanId={selectedPerson}
            handleDeletePerson={handleDeletePerson}
            handleSessionClick={handleSessionClick}
          />
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
