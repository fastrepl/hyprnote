import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";

import { Icon } from "@iconify-icon/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Building2, Mail } from "lucide-react";

import * as persisted from "../../../../store/tinybase/persisted";
import { getInitials } from "./shared";

export function OrganizationDetailsColumn({
  selectedOrganizationId,
  handleDeleteOrganization,
  onPersonClick,
}: {
  selectedOrganizationId?: string | null;
  handleDeleteOrganization: (id: string) => void;
  onPersonClick?: (personId: string) => void;
}) {
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
          <>
            <div className="px-6 py-4 border-b border-neutral-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-neutral-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <EditableOrganizationNameField organizationId={selectedOrganizationId} />
                      <p className="text-sm text-neutral-500 mt-1">
                        {peopleInOrg?.length ?? 0} {(peopleInOrg?.length ?? 0) === 1 ? "person" : "people"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <h3 className="text-sm font-medium text-neutral-600 mb-4">People</h3>
                <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
                  {(peopleInOrg?.length ?? 0) > 0
                    ? (
                      <div className="grid grid-cols-3 gap-4">
                        {peopleInOrg.map((humanId: string) => {
                          const human = allHumans[humanId];
                          if (!human) {
                            return null;
                          }

                          return (
                            <div
                              key={humanId}
                              className="p-4 rounded-lg border border-neutral-200 hover:shadow-sm transition-all bg-white cursor-pointer"
                              onClick={() => onPersonClick?.(humanId)}
                            >
                              <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-medium text-neutral-600">
                                    {getInitials(human.name as string || human.email as string)}
                                  </span>
                                </div>
                                <div className="w-full">
                                  <div className="font-semibold text-sm truncate">
                                    {human.name || human.email || "Unnamed"}
                                  </div>
                                  {human.job_title && (
                                    <div className="text-xs text-neutral-500 truncate mt-1">
                                      {human.job_title as string}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 mt-1">
                                  {human.email && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openUrl(`mailto:${human.email}`);
                                      }}
                                      title="Send email"
                                    >
                                      <Mail />
                                    </Button>
                                  )}
                                  {human.linkedin_username && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const v = String(human.linkedin_username ?? "");
                                        const href = /^https?:\/\//i.test(v)
                                          ? v
                                          : `https://www.linkedin.com/in/${v.replace(/^@/, "")}`;
                                        void openUrl(href);
                                      }}
                                      title="View LinkedIn profile"
                                    >
                                      <Icon icon="logos:linkedin-icon" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                    : <p className="text-sm text-neutral-500">No people in this organization</p>}
                </div>
              </div>

              <div className="p-6">
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                    <h3 className="text-sm font-semibold text-red-900">Danger Zone</h3>
                  </div>
                  <div className="bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Delete this organization</p>
                        <p className="text-xs text-neutral-500 mt-1">This action cannot be undone</p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteOrganization(selectedOrganizationId);
                        }}
                        variant="destructive"
                        size="sm"
                      >
                        Delete Organization
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pb-96" />
            </div>
          </>
        )
        : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-neutral-500">Select an organization to view details</p>
          </div>
        )}
    </div>
  );
}

function EditableOrganizationNameField({ organizationId }: { organizationId: string }) {
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
    <Input
      value={(value as string) || ""}
      onChange={handleChange}
      placeholder="Organization name"
      className="border-none shadow-none p-0 h-8 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
    />
  );
}
