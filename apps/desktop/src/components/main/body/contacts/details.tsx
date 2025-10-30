import { Building2, CircleMinus, FileText, SearchIcon } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import * as main from "../../../../store/tinybase/main";
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
  const selectedPersonData = main.UI.useRow("humans", selectedHumanId ?? "", main.STORE_ID);

  const mappingIdsByHuman = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByHuman,
    selectedHumanId ?? "",
    main.STORE_ID,
  );

  const allMappings = main.UI.useTable("mapping_session_participant", main.STORE_ID);
  const allSessions = main.UI.useTable("sessions", main.STORE_ID);

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
          <>
            <div className="px-6 py-4 border-b border-neutral-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                  <span className="text-lg font-medium text-neutral-600">
                    {getInitials(selectedPersonData.name || selectedPersonData.email)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <EditablePersonNameField personId={selectedHumanId} />
                      {selectedPersonData.is_user && (
                        <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">You</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-neutral-200">
                <EditablePersonJobTitleField personId={selectedHumanId} />

                <div className="flex items-center px-4 py-3 border-b border-neutral-200">
                  <div className="w-28 text-sm text-neutral-500">Company</div>
                  <div className="flex-1">
                    <EditPersonOrganizationSelector personId={selectedHumanId} />
                  </div>
                </div>

                <EditablePersonEmailField personId={selectedHumanId} />
                <EditablePersonLinkedInField personId={selectedHumanId} />
                <EditablePersonMemoField personId={selectedHumanId} />
              </div>

              {personSessions.length > 0 && (
                <div className="p-6 border-b border-neutral-200">
                  <h3 className="text-sm font-medium text-neutral-600 mb-3">Summary</h3>
                  <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      AI-generated summary of all interactions and notes with this contact will appear here. This will
                      synthesize key discussion points, action items, and relationship context across all meetings and
                      notes.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-6">
                <h3 className="text-sm font-medium text-neutral-600 mb-4">Related Notes</h3>
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
                          {session.summary && (
                            <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                              {session.summary}
                            </p>
                          )}
                          {session.created_at && (
                            <div className="text-xs text-neutral-500 mt-1">
                              {new Date(session.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </button>
                      ))
                    )
                    : <p className="text-sm text-neutral-500">No related notes found</p>}
                </div>
              </div>

              {!selectedPersonData.is_user && (
                <div className="p-6">
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                      <h3 className="text-sm font-semibold text-red-900">Danger Zone</h3>
                    </div>
                    <div className="bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">Delete this contact</p>
                          <p className="text-xs text-neutral-500 mt-1">This action cannot be undone</p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeletePerson(selectedHumanId);
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          Delete Contact
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pb-96" />
            </div>
          </>
        )
        : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-neutral-500">Select a person to view details</p>
          </div>
        )}
    </div>
  );
}

function EditablePersonNameField({ personId }: { personId: string }) {
  const value = main.UI.useCell("humans", personId, "name", main.STORE_ID);

  const handleChange = main.UI.useSetCellCallback(
    "humans",
    personId,
    "name",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    main.STORE_ID,
  );

  return (
    <Input
      value={(value as string) || ""}
      onChange={handleChange}
      placeholder="Name"
      className="border-none shadow-none p-0 h-8 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
    />
  );
}

function EditablePersonJobTitleField({ personId }: { personId: string }) {
  const value = main.UI.useCell("humans", personId, "job_title", main.STORE_ID);

  const handleChange = main.UI.useSetCellCallback(
    "humans",
    personId,
    "job_title",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    main.STORE_ID,
  );

  return (
    <div className="flex items-center px-4 py-3 border-b border-neutral-200">
      <div className="w-28 text-sm text-neutral-500">Job Title</div>
      <div className="flex-1">
        <Input
          value={(value as string) || ""}
          onChange={handleChange}
          placeholder="Software Engineer"
          className="border-none shadow-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}

function EditablePersonEmailField({ personId }: { personId: string }) {
  const value = main.UI.useCell("humans", personId, "email", main.STORE_ID);

  const handleChange = main.UI.useSetCellCallback(
    "humans",
    personId,
    "email",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    main.STORE_ID,
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
          className="border-none shadow-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}

function EditablePersonLinkedInField({ personId }: { personId: string }) {
  const value = main.UI.useCell("humans", personId, "linkedin_username", main.STORE_ID);

  const handleChange = main.UI.useSetCellCallback(
    "humans",
    personId,
    "linkedin_username",
    (e: React.ChangeEvent<HTMLInputElement>) => e.target.value,
    [],
    main.STORE_ID,
  );

  return (
    <div className="flex items-center px-4 py-3 border-b border-neutral-200">
      <div className="w-28 text-sm text-neutral-500">LinkedIn</div>
      <div className="flex-1">
        <Input
          value={(value as string) || ""}
          onChange={handleChange}
          placeholder="https://www.linkedin.com/in/johntopia/"
          className="border-none shadow-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}

function EditablePersonMemoField({ personId }: { personId: string }) {
  const value = main.UI.useCell("humans", personId, "memo", main.STORE_ID);

  const handleChange = main.UI.useSetCellCallback(
    "humans",
    personId,
    "memo",
    (e: React.ChangeEvent<HTMLTextAreaElement>) => e.target.value,
    [],
    main.STORE_ID,
  );

  return (
    <div className="flex px-4 py-3 border-b border-neutral-200">
      <div className="w-28 text-sm text-neutral-500 pt-2">Notes</div>
      <div className="flex-1">
        <Textarea
          value={(value as string) || ""}
          onChange={handleChange}
          placeholder="Add notes about this contact..."
          className="border-none shadow-none p-2 min-h-[80px] text-base focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}

function EditPersonOrganizationSelector({ personId }: { personId: string }) {
  const [open, setOpen] = useState(false);
  const orgId = main.UI.useCell("humans", personId, "org_id", main.STORE_ID) as string | null;
  const organization = main.UI.useRow("organizations", orgId ?? "", main.STORE_ID);

  const handleChange = main.UI.useSetCellCallback(
    "humans",
    personId,
    "org_id",
    (newOrgId: string | null) => newOrgId ?? "",
    [],
    main.STORE_ID,
  );

  const handleRemoveOrganization = () => {
    handleChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="inline-flex items-center cursor-pointer hover:bg-neutral-50 py-1 rounded-lg transition-colors">
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
            : <span className="text-neutral-400 text-base">Select organization</span>}
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

  const organizationsData = main.UI.useResultTable(main.QUERIES.visibleOrganizations, main.STORE_ID);

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
