import { Building2, CircleMinus, FileText, Pencil, SearchIcon, TrashIcon } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import * as persisted from "../../../../store/tinybase/persisted";
import { getInitials } from "./shared";

export function DetailsColumn({
  selectedHumanId,
  handleDeletePerson,
  handleSessionClick,
}: {
  selectedHumanId?: string | null;
  handleDeletePerson: (id: string) => void;
  handleSessionClick: (id: string) => void;
}) {
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const selectedPersonData = persisted.UI.useRow("humans", selectedHumanId ?? "", persisted.STORE_ID);

  const mappingIdsByHuman = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionsByHuman,
    selectedHumanId ?? "",
    persisted.STORE_ID,
  );

  const allMappings = persisted.UI.useTable("mapping_session_participant", persisted.STORE_ID);
  const allSessions = persisted.UI.useTable("sessions", persisted.STORE_ID);

  const personSessions = React.useMemo(() => {
    if (!mappingIdsByHuman || mappingIdsByHuman.length === 0) {
      return [];
    }

    return mappingIdsByHuman
      .map((mappingId: string) => {
        const mapping = allMappings[mappingId];
        if (!mapping || !mapping.session_id) {
          return null;
        }

        const sessionId = mapping.session_id as string;
        const session = allSessions[sessionId];
        if (!session) {
          return null;
        }

        return {
          id: sessionId,
          ...session,
        };
      })
      .filter((session: any): session is NonNullable<typeof session> => session !== null);
  }, [mappingIdsByHuman, allMappings, allSessions]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {selectedPersonData && selectedHumanId
        ? (
          editingPerson === selectedHumanId
            ? (
              <EditPersonForm
                personId={selectedHumanId}
                onSave={() => setEditingPerson(null)}
                onCancel={() => setEditingPerson(null)}
              />
            )
            : (
              <>
                <div className="px-6 py-4 border-b border-neutral-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                      <span className="text-lg font-medium text-neutral-600">
                        {getInitials(selectedPersonData.name || selectedPersonData.email)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-lg font-semibold flex items-center gap-2">
                            {selectedPersonData.name || "Unnamed Contact"}
                            {selectedPersonData.is_user && (
                              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">You</span>
                            )}
                          </h2>
                          {selectedPersonData.job_title && (
                            <p className="text-sm text-neutral-600">{selectedPersonData.job_title}</p>
                          )}
                          {selectedPersonData.email && (
                            <p className="text-sm text-neutral-500">{selectedPersonData.email}</p>
                          )}
                          {selectedPersonData.org_id && <OrganizationInfo organizationId={selectedPersonData.org_id} />}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPerson(selectedHumanId)}
                            className="p-2 rounded-md hover:bg-neutral-100 transition-colors"
                            title="Edit contact"
                          >
                            <Pencil className="h-4 w-4 text-neutral-500" />
                          </button>
                          {!selectedPersonData.is_user && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeletePerson(selectedHumanId);
                              }}
                              className="p-2 rounded-md hover:bg-red-50 transition-colors"
                              title="Delete contact"
                            >
                              <TrashIcon className="h-4 w-4 text-red-500 hover:text-red-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6">
                  <h3 className="text-sm font-medium text-neutral-600 mb-4 pl-3">Related Notes</h3>
                  <div className="overflow-y-auto" style={{ maxHeight: "65vh" }}>
                    <div className="space-y-2">
                      {personSessions.length > 0
                        ? (
                          personSessions.map((session: any) => (
                            <button
                              key={session.id}
                              onClick={() => handleSessionClick(session.id)}
                              className="w-full text-left p-3 rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-neutral-500" />
                                <span className="font-medium text-sm">
                                  {session.title || "Untitled Note"}
                                </span>
                              </div>
                              {session.created_at && (
                                <div className="text-xs text-neutral-500">
                                  {new Date(session.created_at).toLocaleDateString()}
                                </div>
                              )}
                            </button>
                          ))
                        )
                        : <p className="text-sm text-neutral-500 pl-3">No related notes found</p>}
                    </div>
                  </div>
                </div>
              </>
            )
        )
        : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-neutral-500">Select a person to view details</p>
          </div>
        )}
    </div>
  );
}

function OrganizationInfo({ organizationId }: { organizationId: string }) {
  const organization = persisted.UI.useRow("organizations", organizationId, persisted.STORE_ID);

  if (!organization) {
    return null;
  }

  return (
    <p className="text-sm text-neutral-500">
      {organization.name}
    </p>
  );
}

function EditPersonForm({
  personId,
  onSave,
  onCancel,
}: {
  personId: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const personData = persisted.UI.useRow("humans", personId, persisted.STORE_ID);

  if (!personData) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Contact</h3>
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
            <span className="text-xl font-semibold text-neutral-600">
              {getInitials(personData.name as string || "?")}
            </span>
          </div>
        </div>

        <div className="border-t border-neutral-200">
          <EditPersonNameField personId={personId} />
          <EditPersonJobTitleField personId={personId} />

          <div className="flex items-center px-4 py-3 border-b border-neutral-200">
            <div className="w-28 text-sm text-neutral-500">Company</div>
            <div className="flex-1">
              <EditPersonOrganizationSelector personId={personId} />
            </div>
          </div>

          <EditPersonEmailField personId={personId} />
          <EditPersonLinkedInField personId={personId} />
        </div>
      </div>
    </div>
  );
}

function EditPersonNameField({ personId }: { personId: string }) {
  const value = persisted.UI.useCell("humans", personId, "name", persisted.STORE_ID);

  const handleChange = persisted.UI.useSetCellCallback(
    "humans",
    personId,
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
          placeholder="John Doe"
          className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}

function EditPersonJobTitleField({ personId }: { personId: string }) {
  const value = persisted.UI.useCell("humans", personId, "job_title", persisted.STORE_ID);

  const handleChange = persisted.UI.useSetCellCallback(
    "humans",
    personId,
    "job_title",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    persisted.STORE_ID,
  );

  return (
    <div className="flex items-center px-4 py-3 border-b border-neutral-200">
      <div className="w-28 text-sm text-neutral-500">Job Title</div>
      <div className="flex-1">
        <Input
          value={(value as string) || ""}
          onChange={handleChange}
          placeholder="Software Engineer"
          className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}

function EditPersonEmailField({ personId }: { personId: string }) {
  const value = persisted.UI.useCell("humans", personId, "email", persisted.STORE_ID);

  const handleChange = persisted.UI.useSetCellCallback(
    "humans",
    personId,
    "email",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    persisted.STORE_ID,
  );

  return (
    <div className="flex items-center px-4 py-3 border-b border-neutral-200">
      <div className="w-28 text-sm text-neutral-500">Email</div>
      <div className="flex-1">
        <Input
          type="email"
          value={(value as string) || ""}
          onChange={handleChange}
          placeholder="john@example.com"
          className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}

function EditPersonLinkedInField({ personId }: { personId: string }) {
  const value = persisted.UI.useCell("humans", personId, "linkedin_username", persisted.STORE_ID);

  const handleChange = persisted.UI.useSetCellCallback(
    "humans",
    personId,
    "linkedin_username",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    persisted.STORE_ID,
  );

  return (
    <div className="flex items-center px-4 py-3 border-b border-neutral-200">
      <div className="w-28 text-sm text-neutral-500">LinkedIn</div>
      <div className="flex-1">
        <Input
          value={(value as string) || ""}
          onChange={handleChange}
          placeholder="https://www.linkedin.com/in/johntopia/"
          className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}

function EditPersonOrganizationSelector({ personId }: { personId: string }) {
  const [open, setOpen] = useState(false);
  const orgId = persisted.UI.useCell("humans", personId, "org_id", persisted.STORE_ID) as string | null;
  const organization = persisted.UI.useRow("organizations", orgId ?? "", persisted.STORE_ID);

  const handleChange = persisted.UI.useSetCellCallback(
    "humans",
    personId,
    "org_id",
    (newOrgId: string | null) => newOrgId ?? "",
    [],
    persisted.STORE_ID,
  );

  const handleRemoveOrganization = () => {
    handleChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex flex-row items-center cursor-pointer">
          {organization
            ? (
              <div className="flex items-center">
                <span className="text-base">{organization.name}</span>
                <span className="ml-2 text-neutral-400 group">
                  <CircleMinus
                    className="size-4 cursor-pointer text-neutral-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveOrganization();
                    }}
                  />
                </span>
              </div>
            )
            : <span className="text-neutral-500 text-base">Select organization</span>}
        </div>
      </PopoverTrigger>

      <PopoverContent className="shadow-lg p-3" align="start" side="bottom">
        <OrganizationControl onChange={handleChange} closePopover={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function OrganizationControl({
  onChange,
  closePopover,
}: {
  onChange: (orgId: string | null) => void;
  closePopover: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const organizationsData = persisted.UI.useResultTable(persisted.QUERIES.visibleOrganizations, persisted.STORE_ID);

  const allOrganizations = Object.entries(organizationsData).map(([id, data]) => ({
    id,
    ...(data as any),
  }));

  const organizations = searchTerm.trim()
    ? allOrganizations.filter((org: any) => org.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : allOrganizations;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const selectOrganization = (orgId: string) => {
    onChange(orgId);
    closePopover();
  };

  return (
    <div className="flex flex-col gap-3 max-w-[450px]">
      <div className="text-sm font-medium text-neutral-700">Organization</div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
            <span className="text-neutral-500 flex-shrink-0">
              <SearchIcon className="size-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or add company"
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {searchTerm.trim() && (
            <div className="flex flex-col w-full rounded border border-neutral-200 overflow-hidden">
              {organizations.map((org: any) => (
                <button
                  key={org.id}
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
                  onClick={() => selectOrganization(org.id)}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-100 rounded-full">
                    <Building2 className="size-3" />
                  </span>
                  <span className="font-medium truncate">{org.name}</span>
                </button>
              ))}

              {organizations.length === 0 && (
                <button
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
                  onClick={() => {}}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-200 rounded-full">
                    <span className="text-xs">+</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-neutral-600">
                    Create
                    <span className="text-neutral-900 truncate max-w-[140px]">
                      &quot;{searchTerm.trim()}&quot;
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}

          {!searchTerm.trim() && organizations.length > 0 && (
            <div className="flex flex-col w-full rounded border border-neutral-200 overflow-hidden max-h-[40vh] overflow-y-auto custom-scrollbar">
              {organizations.map((org: any) => (
                <button
                  key={org.id}
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
                  onClick={() => selectOrganization(org.id)}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-100 rounded-full">
                    <Building2 className="size-3" />
                  </span>
                  <span className="font-medium truncate">{org.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
