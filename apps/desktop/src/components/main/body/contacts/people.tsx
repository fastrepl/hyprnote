import { cn } from "@hypr/utils";

import { useMemo, useState } from "react";

import * as persisted from "../../../../store/tinybase/persisted";
import { ColumnHeader, getInitials, type SortOption } from "./shared";

export function PeopleColumn({
  currentOrgId,
  currentHumanId,
  setSelectedPerson,
}: {
  currentOrgId?: string | null;
  currentHumanId?: string | null;
  setSelectedPerson: (id: string | null) => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const { humanIds, sortOption, setSortOption } = useSortedHumanIds(currentOrgId);

  const allHumans = persisted.UI.useTable("humans", persisted.STORE_ID);

  const filteredHumanIds = useMemo(() => {
    if (!searchValue.trim()) {
      return humanIds;
    }

    return humanIds.filter((id) => {
      const human = allHumans[id];
      const searchLower = searchValue.toLowerCase();
      return (
        human?.name?.toLowerCase().includes(searchLower)
        || human?.email?.toLowerCase().includes(searchLower)
      );
    });
  }, [humanIds, searchValue, allHumans]);

  return (
    <div className="w-full h-full flex flex-col">
      <ColumnHeader
        title="People"
        sortOption={sortOption}
        setSortOption={setSortOption}
        onAdd={() => {}}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredHumanIds.map((humanId) => (
            <PersonItem
              key={humanId}
              active={currentHumanId === humanId}
              humanId={humanId}
              setSelectedPerson={setSelectedPerson}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function useSortedHumanIds(currentOrgId?: string | null) {
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const allAlphabeticalIds = persisted.UI.useResultSortedRowIds(
    persisted.QUERIES.visibleHumans,
    "name",
    false,
    0,
    undefined,
    persisted.STORE_ID,
  );
  const allNewestIds = persisted.UI.useResultSortedRowIds(
    persisted.QUERIES.visibleHumans,
    "created_at",
    true,
    0,
    undefined,
    persisted.STORE_ID,
  );
  const allOldestIds = persisted.UI.useResultSortedRowIds(
    persisted.QUERIES.visibleHumans,
    "created_at",
    false,
    0,
    undefined,
    persisted.STORE_ID,
  );

  const thisOrgHumanIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.humansByOrg,
    currentOrgId ?? "",
    persisted.STORE_ID,
  );

  const humanIds = currentOrgId
    ? (sortOption === "alphabetical"
      ? allAlphabeticalIds
      : sortOption === "newest"
      ? allNewestIds
      : allOldestIds).filter((id) => thisOrgHumanIds.includes(id))
    : (sortOption === "alphabetical"
      ? allAlphabeticalIds
      : sortOption === "newest"
      ? allNewestIds
      : allOldestIds);

  return { humanIds, sortOption, setSortOption };
}

function PersonItem({
  humanId,
  active,
  setSelectedPerson,
}: {
  humanId: string;
  active: boolean;
  setSelectedPerson: (id: string | null) => void;
}) {
  const person = persisted.UI.useRow("humans", humanId, persisted.STORE_ID);

  return (
    <button
      onClick={() => setSelectedPerson(humanId)}
      className={cn([
        "w-full text-left px-3 py-2 rounded-md text-sm  border hover:bg-neutral-100 transition-colors flex items-center gap-2",
        active ? "border-neutral-500 bg-neutral-100" : "border-transparent",
      ])}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
        <span className="text-xs font-medium text-neutral-600">
          {getInitials(person.name || person.email)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate flex items-center gap-1">
          {person.name || person.email || "Unnamed"}
          {person.is_user && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">You</span>}
        </div>
        {person.email && person.name && <div className="text-xs text-neutral-500 truncate">{person.email}</div>}
      </div>
    </button>
  );
}
