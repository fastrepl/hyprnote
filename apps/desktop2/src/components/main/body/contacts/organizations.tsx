import { Building2, CornerDownLeft, Pencil, User } from "lucide-react";
import React, { useState } from "react";

import { cn } from "@hypr/ui/lib/utils";
import * as persisted from "../../../../store/tinybase/persisted";
import { ColumnHeader, type SortOption } from "./shared";

export function OrganizationsColumn({
  selectedOrganization,
  setSelectedOrganization,
}: {
  selectedOrganization: string | null;
  setSelectedOrganization: (id: string | null) => void;
}) {
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [showNewOrg, setShowNewOrg] = useState(false);
  const { organizationIds, sortOption, setSortOption } = useSortedOrganizationIds();

  return (
    <div className="w-[200px] border-r border-neutral-200 flex flex-col">
      <ColumnHeader
        title="Organizations"
        sortOption={sortOption}
        setSortOption={setSortOption}
        onAdd={() => setShowNewOrg(true)}
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
          {organizationIds.map((orgId) =>
            editingOrg === orgId
              ? (
                <EditOrganizationForm
                  key={orgId}
                  organizationId={orgId}
                  onSave={() => setEditingOrg(null)}
                  onCancel={() => setEditingOrg(null)}
                />
              )
              : (
                <OrganizationItem
                  key={orgId}
                  organizationId={orgId}
                  isSelected={selectedOrganization === orgId}
                  setSelectedOrganization={setSelectedOrganization}
                  handleEditOrganization={() => setEditingOrg(orgId)}
                />
              )
          )}
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
  setSelectedOrganization,
  handleEditOrganization,
}: {
  organizationId: string;
  isSelected: boolean;
  setSelectedOrganization: (id: string | null) => void;
  handleEditOrganization: (id: string) => void;
}) {
  const organization = persisted.UI.useRow("organizations", organizationId, persisted.STORE_ID);

  return (
    <div
      className={cn([
        "group relative rounded-md transition-colors",
        isSelected && "bg-neutral-100",
      ])}
    >
      <button
        onClick={() => setSelectedOrganization(organizationId)}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-100 transition-colors rounded-md"
      >
        <Building2 className="h-4 w-4 text-neutral-500" />
        {organization.name}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleEditOrganization(organizationId);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 transition-all"
      >
        <Pencil className="h-3 w-3 text-neutral-500" />
      </button>
    </div>
  );
}

function EditOrganizationForm({
  organizationId,
  onSave,
  onCancel,
}: {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const name = persisted.UI.useCell("organizations", organizationId, "name", persisted.STORE_ID);

  const handleChange = persisted.UI.useSetCellCallback(
    "organizations",
    organizationId,
    "name",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    persisted.STORE_ID,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name?.trim()) {
      onSave();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (name?.trim()) {
        onSave();
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
            value={name || ""}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Organization name"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
            autoFocus
          />
          {name?.trim() && (
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
              aria-label="Save organization"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
        </div>
      </form>
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
