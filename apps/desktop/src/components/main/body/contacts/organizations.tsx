import { cn } from "@hypr/utils";

import { Building2, CornerDownLeft, User } from "lucide-react";
import React, { useState } from "react";

import * as persisted from "../../../../store/tinybase/persisted";
import { ColumnHeader, type SortOption } from "./shared";

export function OrganizationsColumn({
  selectedOrganization,
  setSelectedOrganization,
  isViewingOrgDetails,
}: {
  selectedOrganization: string | null;
  setSelectedOrganization: (id: string | null) => void;
  isViewingOrgDetails: boolean;
}) {
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { organizationIds, sortOption, setSortOption } = useSortedOrganizationIds();

  const allOrgs = persisted.UI.useTable("organizations", persisted.STORE_ID);

  const filteredOrganizationIds = React.useMemo(() => {
    if (!searchValue.trim()) {
      return organizationIds;
    }

    return organizationIds.filter((id) => {
      const org = allOrgs[id];
      return org?.name?.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [organizationIds, searchValue, allOrgs]);

  return (
    <div className="w-full h-full flex flex-col">
      <ColumnHeader
        title="Organizations"
        sortOption={sortOption}
        setSortOption={setSortOption}
        onAdd={() => setShowNewOrg(true)}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <button
            onClick={() => setSelectedOrganization(null)}
            className={cn([
              "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-neutral-100 transition-colors",
              !selectedOrganization && "bg-neutral-100",
            ])}
          >
            <User className="h-4 w-4 text-neutral-500" />
            All People
          </button>
          {showNewOrg && (
            <NewOrganizationForm
              onSave={() => setShowNewOrg(false)}
              onCancel={() => setShowNewOrg(false)}
            />
          )}
          {filteredOrganizationIds.map((orgId) => (
            <OrganizationItem
              key={orgId}
              organizationId={orgId}
              isSelected={selectedOrganization === orgId}
              isViewingDetails={isViewingOrgDetails && selectedOrganization === orgId}
              setSelectedOrganization={setSelectedOrganization}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function useSortedOrganizationIds() {
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const alphabeticalIds = persisted.UI.useResultSortedRowIds(
    persisted.QUERIES.visibleOrganizations,
    "name",
    false,
    0,
    undefined,
    persisted.STORE_ID,
  );
  const newestIds = persisted.UI.useResultSortedRowIds(
    persisted.QUERIES.visibleOrganizations,
    "created_at",
    true,
    0,
    undefined,
    persisted.STORE_ID,
  );
  const oldestIds = persisted.UI.useResultSortedRowIds(
    persisted.QUERIES.visibleOrganizations,
    "created_at",
    false,
    0,
    undefined,
    persisted.STORE_ID,
  );

  const organizationIds = sortOption === "alphabetical"
    ? alphabeticalIds
    : sortOption === "newest"
    ? newestIds
    : oldestIds;

  return { organizationIds, sortOption, setSortOption };
}

function OrganizationItem({
  organizationId,
  isSelected,
  isViewingDetails,
  setSelectedOrganization,
}: {
  organizationId: string;
  isSelected: boolean;
  isViewingDetails: boolean;
  setSelectedOrganization: (id: string | null) => void;
}) {
  const organization = persisted.UI.useRow("organizations", organizationId, persisted.STORE_ID);
  if (!organization) {
    return null;
  }

  return (
    <div
      className={cn([
        "group relative rounded-md transition-colors border",
        isSelected && "bg-neutral-100",
        isSelected && isViewingDetails ? "border-black" : "border-transparent",
      ])}
    >
      <button
        onClick={() => setSelectedOrganization(organizationId)}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-100 transition-colors rounded-md"
      >
        <Building2 className="h-4 w-4 text-neutral-500 shrink-0" />
        <p className="truncate">{organization.name}</p>
      </button>
    </div>
  );
}

function NewOrganizationForm({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  const handleAdd = persisted.UI.useAddRowCallback(
    "organizations",
    () => ({
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    [name],
    persisted.STORE_ID,
    () => {
      setName("");
      onSave();
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      handleAdd();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (name.trim()) {
        handleAdd();
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="p-2">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add organization"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
            autoFocus
          />
          {name.trim() && (
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
              aria-label="Add organization"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
