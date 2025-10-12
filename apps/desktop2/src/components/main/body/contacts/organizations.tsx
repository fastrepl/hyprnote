import { Building2, CornerDownLeft, Pencil, Plus, User } from "lucide-react";
import React, { useState } from "react";

import { cn } from "@hypr/ui/lib/utils";
import * as persisted from "../../../../store/tinybase/persisted";

export function OrganizationsColumn({
  selectedOrganization,
  setSelectedOrganization,
  showNewOrg,
  setShowNewOrg,
  editingOrg,
  setEditingOrg,
  organizations,
  handleEditOrganization,
}: {
  selectedOrganization: string | null;
  setSelectedOrganization: (id: string | null) => void;
  showNewOrg: boolean;
  setShowNewOrg: (show: boolean) => void;
  editingOrg: string | null;
  setEditingOrg: (id: string | null) => void;
  organizations: any[];
  handleEditOrganization: (id: string) => void;
}) {
  return (
    <div className="w-[200px] border-r border-neutral-200 flex flex-col">
      <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between h-12">
        <h3 className="text-xs font-medium text-neutral-600">Organizations</h3>
        <button
          onClick={() => setShowNewOrg(true)}
          className="p-0.5 rounded hover:bg-neutral-100 transition-colors"
        >
          <Plus className="h-3 w-3 text-neutral-500" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <button
            onClick={() => setSelectedOrganization(null)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-neutral-100 transition-colors",
              !selectedOrganization && "bg-neutral-100",
            )}
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
          {organizations.map((org: any) =>
            editingOrg === org.id
              ? (
                <EditOrganizationForm
                  key={org.id}
                  organization={org}
                  onSave={() => setEditingOrg(null)}
                  onCancel={() => setEditingOrg(null)}
                />
              )
              : (
                <div
                  key={org.id}
                  className={cn(
                    "group relative rounded-md transition-colors",
                    selectedOrganization === org.id && "bg-neutral-100",
                  )}
                >
                  <button
                    onClick={() => setSelectedOrganization(org.id)}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-100 transition-colors rounded-md"
                  >
                    <Building2 className="h-4 w-4 text-neutral-500" />
                    {org.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditOrganization(org.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 transition-all"
                  >
                    <Pencil className="h-3 w-3 text-neutral-500" />
                  </button>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
}

function EditOrganizationForm({
  organization,
  onSave,
  onCancel,
}: {
  organization: any;
  onSave: () => void;
  onCancel: () => void;
}) {
  const name = persisted.UI.useCell("organizations", organization.id, "name", persisted.STORE_ID);

  const handleChange = persisted.UI.useSetCellCallback(
    "organizations",
    organization.id,
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
