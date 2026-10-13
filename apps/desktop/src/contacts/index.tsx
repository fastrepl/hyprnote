import { useCallback } from "react";

import type { ContactsSelection } from "@anlg/plugin-windows";

import { DetailsColumn } from "./details";
import { deleteHuman, useHumans, useOrganizations } from "./queries";

import { useOptionalAuth } from "~/auth";
import { StandardContentWrapper } from "~/shared/main";
import { useOwnerUserId } from "~/shared/owner-user";
import { type Tab, useTabs } from "~/store/zustand/tabs";

export function TabContentContact({
  tab,
}: {
  tab: Extract<Tab, { type: "contacts" }>;
}) {
  return (
    <StandardContentWrapper>
      <CandidateView tab={tab} />
    </StandardContentWrapper>
  );
}

function CandidateView({ tab }: { tab: Extract<Tab, { type: "contacts" }> }) {
  const updateContactsTabState = useTabs(
    (state) => state.updateContactsTabState,
  );
  const openCurrent = useTabs((state) => state.openCurrent);
  const invalidateResource = useTabs((state) => state.invalidateResource);
  const selected = tab.state.selected;
  const localOwnerUserId = useOwnerUserId();
  const auth = useOptionalAuth();
  const ownerUserId = auth?.session?.user.id ?? localOwnerUserId;
  const humans = useHumans();
  const organizations = useOrganizations();

  const setSelected = useCallback(
    (value: ContactsSelection | null) => {
      updateContactsTabState(tab, { selected: value });
    },
    [updateContactsTabState, tab],
  );

  const handleSessionClick = useCallback(
    (id: string) => openCurrent({ type: "sessions", id }),
    [openCurrent],
  );

  const handleDeletePerson = useCallback(
    (id: string) => {
      invalidateResource("humans", id);
      void deleteHuman(id).catch((error) => {
        console.error("[candidates] failed to delete candidate", error);
      });
      setSelected(null);
    },
    [invalidateResource, setSelected],
  );

  const firstCandidate = humans.find((human) => human.id !== ownerUserId);
  const selectedCandidate =
    selected?.type === "person"
      ? humans.find((human) => human.id === selected.id) ?? null
      : firstCandidate ?? null;

  return (
    <div className="h-full">
      <DetailsColumn
        key={selectedCandidate?.id ?? "empty"}
        human={selectedCandidate}
        humans={humans}
        organizations={organizations}
        handleSessionClick={handleSessionClick}
        onDelete={handleDeletePerson}
      />
    </div>
  );
}
