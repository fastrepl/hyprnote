
import { Reorder } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import type { ContactsSelection } from "@anlg/plugin-windows";
import { Button } from "@anlg/ui/components/ui/button";

import { useOptionalAuth } from "~/auth";
import { NewPersonForm } from "~/contacts/new-person-form";
import { OrganizationItem } from "~/contacts/organization-item";
import { PersonItem } from "~/contacts/person-item";
import {
  deleteHuman,
  deleteOrganization,
  type HumanRecord,
  type OrganizationRecord,
  reorderPinnedContacts,
  useHumans,
  useOrganizations,
} from "~/contacts/queries";
import { ColumnHeader, type SortOption } from "~/contacts/shared";
import { useOwnerUserId } from "~/shared/owner-user";
import { useTabs } from "~/store/zustand/tabs";

type ContactItem =
  | { kind: "person"; id: string; person: HumanRecord }
  | {
      kind: "organization";
      id: string;
      organization: OrganizationRecord;
    };

export function ContactsNav() {
  const currentTab = useTabs((state) => state.currentTab);
  const updateContactsTabState = useTabs(
    (state) => state.updateContactsTabState,
  );
  const invalidateResource = useTabs((state) => state.invalidateResource);

  const selected =
    currentTab?.type === "contacts" ? currentTab.state.selected : null;

  const setSelected = useCallback(
    (value: ContactsSelection | null) => {
      if (currentTab?.type === "contacts") {
        updateContactsTabState(currentTab, { selected: value });
      }
    },
    [currentTab, updateContactsTabState],
  );

  const handleDeletePerson = useCallback(
    (id: string) => {
      invalidateResource("humans", id);
      void deleteHuman(id).catch((error) => {
        console.error("[candidates] failed to delete candidate", error);
      });
      if (selected?.type === "person" && selected.id === id) {
        setSelected(null);
      }
    },
    [invalidateResource, selected, setSelected],
  );

  const handleDeleteOrganization = useCallback(
    (id: string) => {
      invalidateResource("organizations" as const, id);
      void deleteOrganization(id).catch((error) => {
        console.error("[contacts] failed to delete organization", error);
      });
      if (selected?.type === "organization" && selected.id === id) {
        setSelected(null);
      }
    },
    [invalidateResource, selected, setSelected],
  );

  return (
    <CandidatesList
      selected={selected}
      setSelected={setSelected}
      onDeletePerson={handleDeletePerson}
      onDeleteOrganization={handleDeleteOrganization}
    />
  );
}

function CandidatesList({
  selected,
  setSelected,
  onDeletePerson,
  onDeleteOrganization,
}: {
  selected: ContactsSelection | null;
  setSelected: (value: ContactsSelection | null) => void;
  onDeletePerson: (id: string) => void;
  onDeleteOrganization: (id: string) => void;
}) {
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openCurrent = useTabs((state) => state.openCurrent);

  useHotkeys(
    "mod+f",
    () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    { preventDefault: true, enableOnFormTags: true },
    [],
  );

  const localOwnerUserId = useOwnerUserId();
  const auth = useOptionalAuth();
  const ownerUserId = auth?.session?.user.id ?? localOwnerUserId;
  const humans = useHumans();
  const organizations = useOrganizations();
  const self = humans.find((human) => human.id === ownerUserId);

  const { pinnedItems, nonPinnedItems, teamItems } = useMemo(() => {
    const q = searchValue.toLowerCase().trim();

    const compare = (
      a: { name: string; createdAt: string },
      b: { name: string; createdAt: string },
    ) => {
      if (sortOption === "alphabetical") {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === "reverse-alphabetical") {
        return b.name.localeCompare(a.name);
      }

      const byCreatedAt = a.createdAt.localeCompare(b.createdAt);
      return sortOption === "newest" ? -byCreatedAt : byCreatedAt;
    };

    const filteredHumans = humans
      .filter((human) => {
        if (human.id === ownerUserId) return false;
        if (!q) return true;

        return [
          human.name,
          human.email,
          human.phone,
          human.jobTitle,
          human.memo,
        ].some((value) => value.toLowerCase().includes(q));
      })
      .sort(compare);

    const filteredOrganizations = organizations
      .filter(
        (organization) =>
          !q || organization.name.toLowerCase().includes(q),
      )
      .sort(compare);

    const teamOrganizations = filteredOrganizations.filter(
      (organization) => organization.teamWorkspace,
    );
    const otherOrganizations = filteredOrganizations.filter(
      (organization) => !organization.teamWorkspace,
    );

    const allPinned: ContactItem[] = [
      ...filteredHumans
        .filter((human) => human.pinned)
        .map((person) => ({
          kind: "person" as const,
          id: person.id,
          person,
        })),
      ...otherOrganizations
        .filter((organization) => organization.pinned)
        .map((organization) => ({
          kind: "organization" as const,
          id: organization.id,
          organization,
        })),
    ].sort((a, b) => {
      const aOrder =
        a.kind === "person" ? a.person.pinOrder : a.organization.pinOrder;
      const bOrder =
        b.kind === "person" ? b.person.pinOrder : b.organization.pinOrder;

      return (aOrder ?? Infinity) - (bOrder ?? Infinity);
    });

    const unpinnedOrganizations: ContactItem[] = otherOrganizations
      .filter((organization) => !organization.pinned)
      .map((organization) => ({
        kind: "organization" as const,
        id: organization.id,
        organization,
      }));

    const unpinnedPeople: ContactItem[] = filteredHumans
      .filter((human) => !human.pinned)
      .map((person) => ({
        kind: "person" as const,
        id: person.id,
        person,
      }));

    return {
      pinnedItems: allPinned,
      nonPinnedItems: [...unpinnedOrganizations, ...unpinnedPeople],
      teamItems: teamOrganizations,
    };
  }, [humans, organizations, searchValue, sortOption, ownerUserId]);

  const handleReorderPinned = useCallback(
    (newOrder: string[]) => {
      const contacts = newOrder.flatMap((id) => {
        const item = pinnedItems.find((candidate) => candidate.id === id);

        if (!item) return [];

        return [
          {
            type:
              item.kind === "person"
                ? ("human" as const)
                : ("organization" as const),
            id,
          },
        ];
      });

      void reorderPinnedContacts(contacts).catch((error) => {
        console.error("[contacts] failed to reorder pins", error);
      });
    },
    [pinnedItems],
  );

  const handleAdd = useCallback(() => {
    setShowNewPerson(true);
  }, []);

  const isActive = (item: ContactItem) =>
    selected?.type === item.kind && selected.id === item.id;

  const renderContactItem = (item: ContactItem, keyPrefix: string) => {
    if (item.kind === "person") {
      return (
        <PersonItem
          key={`${keyPrefix}-${item.id}`}
          active={isActive(item)}
          person={item.person}
          onClick={() => setSelected({ type: "person", id: item.id })}
          onDelete={onDeletePerson}
        />
      );
    }

    return (
      <OrganizationItem
        key={`${keyPrefix}-${item.id}`}
        active={isActive(item)}
        organization={item.organization}
        onClick={() =>
          setSelected({ type: "organization", id: item.id })
        }
        onDelete={onDeleteOrganization}
      />
    );
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <div className="text-foreground text-sm font-semibold">Candidates</div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openCurrent({ type: "interviews" })}
        >
          Interviews
        </Button>
      </div>

      <ColumnHeader
        sortOption={sortOption}
        setSortOption={setSortOption}
        onAdd={handleAdd}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchInputRef={searchInputRef}
      />

      <div className="scrollbar-hide flex-1 overflow-y-auto">
        {self && (
          <PersonItem
            person={self}
            readOnly
            active={selected?.type === "person" && selected.id === self.id}
            onClick={() => setSelected({ type: "person", id: self.id })}
          />
        )}

        {showNewPerson && (
          <NewPersonForm
            onSave={(humanId) => {
              setShowNewPerson(false);
              setSelected({ type: "person", id: humanId });
            }}
            onCancel={() => setShowNewPerson(false)}
          />
        )}

        {teamItems.map((organization) => (
          <OrganizationItem
            key={`team-org-${organization.id}`}
            organization={organization}
            readOnly
            active={
              selected?.type === "organization" &&
              selected.id === organization.id
            }
            onClick={() =>
              setSelected({ type: "organization", id: organization.id })
            }
          />
        ))}

        {pinnedItems.length > 0 && !searchValue.trim() && (
          <Reorder.Group
            axis="y"
            values={pinnedItems.map((item) => item.id)}
            onReorder={handleReorderPinned}
            className="flex flex-col"
          >
            {pinnedItems.map((item) => (
              <Reorder.Item key={item.id} value={item.id}>
                {renderContactItem(item, "pinned")}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}

        {pinnedItems.length > 0 && searchValue.trim() && (
          <div className="flex flex-col">
            {pinnedItems.map((item) =>
              renderContactItem(item, "filtered-pinned"),
            )}
          </div>
        )}

        {pinnedItems.length > 0 && nonPinnedItems.length > 0 && (
          <div className="bg-accent mx-3 my-1 h-px" />
        )}

        {nonPinnedItems.map((item) =>
          renderContactItem(item, "unpinned"),
        )}

        {pinnedItems.length === 0 &&
          nonPinnedItems.length === 0 &&
          teamItems.length === 0 &&
          !showNewPerson && (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              {searchValue.trim()
                ? "No contacts match your search."
                : "No candidates or organizations yet. Add a candidate to get started."}
            </p>
          )}
      </div>
    </div>
  );
}
