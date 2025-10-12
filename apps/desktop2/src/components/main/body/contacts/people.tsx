import { useState } from "react";

import { cn } from "@hypr/ui/lib/utils";
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
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const thisOrgHumanIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.humansByOrg,
    currentOrgId ?? "",
    persisted.STORE_ID,
  );
  const allHumanIds = persisted.UI.useRowIds("humans", persisted.STORE_ID);

  const humanIds = currentOrgId ? thisOrgHumanIds : allHumanIds;

  return (
    <div className="w-[250px] border-r border-neutral-200 flex flex-col">
      <ColumnHeader
        title="People"
        sortOption={sortOption}
        setSortOption={setSortOption}
        onAdd={() => {
        }}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {humanIds.map((humanId) => (
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
        "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 transition-colors flex items-center gap-2",
        active && "bg-neutral-100",
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
