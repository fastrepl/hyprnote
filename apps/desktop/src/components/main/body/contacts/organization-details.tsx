import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";

import { Building2, Pencil, TrashIcon } from "lucide-react";
import React, { useState } from "react";

import * as persisted from "../../../../store/tinybase/persisted";
import { getInitials } from "./shared";

export function OrganizationDetailsColumn({
  selectedOrganizationId,
  handleDeleteOrganization,
}: {
  selectedOrganizationId?: string | null;
  handleDeleteOrganization: (id: string) => void;
}) {
  const [editingOrganization, setEditingOrganization] = useState<string | null>(null);
  const selectedOrgData = persisted.UI.useRow("organizations", selectedOrganizationId ?? "", persisted.STORE_ID);

  const peopleInOrg = persisted.UI.useSliceRowIds(
    persisted.INDEXES.humansByOrg,
    selectedOrganizationId ?? "",
    persisted.STORE_ID,
  );

  const allHumans = persisted.UI.useTable("humans", persisted.STORE_ID);

  return (
    <div className="flex-1 flex flex-col">
      {selectedOrgData && selectedOrganizationId
        ? (
          editingOrganization === selectedOrganizationId
            ? (
              <EditOrganizationForm
                organizationId={selectedOrganizationId}
                onSave={() => setEditingOrganization(null)}
                onCancel={() => setEditingOrganization(null)}
              />
            )
            : (
              <>
                <div className="px-6 py-4 border-b border-neutral-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-neutral-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-lg font-semibold flex items-center gap-2">
                            {selectedOrgData.name || "Unnamed Organization"}
                          </h2>
                          <p className="text-sm text-neutral-500 mt-1">
                            {peopleInOrg.length} {peopleInOrg.length === 1 ? "person" : "people"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingOrganization(selectedOrganizationId)}
                            className="p-2 rounded-md hover:bg-neutral-100 transition-colors"
                            title="Edit organization"
                          >
                            <Pencil className="h-4 w-4 text-neutral-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteOrganization(selectedOrganizationId);
                            }}
                            className="p-2 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete organization"
                          >
                            <TrashIcon className="h-4 w-4 text-red-500 hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6">
                  <h3 className="text-sm font-medium text-neutral-600 mb-4 pl-3">People</h3>
                  <div className="overflow-y-auto" style={{ maxHeight: "65vh" }}>
                    <div className="space-y-2">
                      {peopleInOrg.length > 0
                        ? (
                          peopleInOrg.map((humanId: string) => {
                            const human = allHumans[humanId];
                            if (!human) {
                              return null;
                            }

                            return (
                              <div
                                key={humanId}
                                className="p-3 rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-neutral-600">
                                      {getInitials(human.name as string || human.email as string)}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {human.name || human.email || "Unnamed"}
                                    </div>
                                    {human.email && human.name && (
                                      <div className="text-xs text-neutral-500 truncate">{human.email as string}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                        : <p className="text-sm text-neutral-500 pl-3">No people in this organization</p>}
                    </div>
                  </div>
                </div>
              </>
            )
        )
        : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-neutral-500">Select an organization to view details</p>
          </div>
        )}
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
  const orgData = persisted.UI.useRow("organizations", organizationId, persisted.STORE_ID);

  if (!orgData) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Organization</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="hover:bg-neutral-100 text-neutral-700"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              variant="ghost"
              size="sm"
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 mb-3 bg-neutral-200 rounded-full flex items-center justify-center">
            <Building2 className="h-12 w-12 text-neutral-600" />
          </div>
        </div>

        <div className="border-t border-neutral-200">
          <EditOrganizationNameField organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
}

function EditOrganizationNameField({ organizationId }: { organizationId: string }) {
  const value = persisted.UI.useCell("organizations", organizationId, "name", persisted.STORE_ID);

  const handleChange = persisted.UI.useSetCellCallback(
    "organizations",
    organizationId,
    "name",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    persisted.STORE_ID,
  );

  return (
    <div className="flex items-center px-4 py-3 border-b border-neutral-200">
      <div className="w-28 text-sm text-neutral-500">Name</div>
      <div className="flex-1">
        <Input
          value={(value as string) || ""}
          onChange={handleChange}
          placeholder="Organization name"
          className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}
