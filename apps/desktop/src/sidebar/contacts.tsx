import { useCallback, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import type { ContactsSelection } from "@anlg/plugin-windows";

import { Button } from "@anlg/ui/components/ui/button";

import { useOptionalAuth } from "~/auth";
import { NewPersonForm } from "~/contacts/new-person-form";
import { PersonItem } from "~/contacts/person-item";
import {
  deleteHuman,
  type HumanRecord,
  useHumans,
} from "~/contacts/queries";
import { ColumnHeader, type SortOption } from "~/contacts/shared";
import { useOwnerUserId } from "~/shared/owner-user";
import { useTabs } from "~/store/zustand/tabs";

type CandidateItem = { id: string; person: HumanRecord };

export function ContactsNav() {
  const currentTab = useTabs((state) => state.currentTab);
  const updateContactsTabState = useTabs(
    (state) => state.updateContactsTabState,
  );
  const invalidateResource = useTabs((state) => state.invalidateResource);

  const selected =
    currentTab?.type === "contacts" &&
    currentTab.state.selected?.type === "person"
      ? currentTab.state.selected
      : null;

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
      setSelected(null);
    },
    [invalidateResource, setSelected],
  );

  return (
    <CandidatesList
      selected={selected}
      setSelected={setSelected}
      onDeletePerson={handleDeletePerson}
    />
  );
}

function CandidatesList({
  selected,
  setSelected,
  onDeletePerson,
}: {
  selected: ContactsSelection | null;
  setSelected: (value: ContactsSelection | null) => void;
  onDeletePerson: (id: string) => void;
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

  const candidates = useMemo(() => {
    const q = searchValue.toLowerCase().trim();

    const compare = (
      a: { name: string; createdAt: string },
      b: { name: string; createdAt: string },
    ) => {
      if (sortOption === "alphabetical") return a.name.localeCompare(b.name);
      if (sortOption === "reverse-alphabetical") {
        return b.name.localeCompare(a.name);
      }
      const byCreatedAt = a.createdAt.localeCompare(b.createdAt);
      return sortOption === "newest" ? -byCreatedAt : byCreatedAt;
    };

    return humans
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
      .sort(compare)
      .map((person) => ({ id: person.id, person }));
  }, [humans, ownerUserId, searchValue, sortOption]);

  const handleAdd = useCallback(() => setShowNewPerson(true), []);

  const isActive = (item: CandidateItem) =>
    selected?.type === "person" && selected.id === item.id;

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
        {showNewPerson && (
          <NewPersonForm
            onSave={(humanId) => {
              setShowNewPerson(false);
              setSelected({ type: "person", id: humanId });
            }}
            onCancel={() => setShowNewPerson(false)}
          />
        )}

        {candidates.map((item) => (
          <PersonItem
            key={item.id}
            active={isActive(item)}
            person={item.person}
            onClick={() => setSelected({ type: "person", id: item.id })}
            onDelete={onDeletePerson}
          />
        ))}

        {candidates.length === 0 && (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">
            {searchValue.trim()
              ? "No candidates match your search."
              : "No candidates yet. Add a candidate to get started."}
          </p>
        )}
      </div>
    </div>
  );
}
