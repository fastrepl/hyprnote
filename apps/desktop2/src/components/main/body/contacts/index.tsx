import {
  Building2,
  CircleMinus,
  Contact2Icon,
  CornerDownLeft,
  FileText,
  Pencil,
  Plus,
  SearchIcon,
  TrashIcon,
  User,
  UserPlus,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import * as persisted from "../../../../store/tinybase/persisted";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "../shared";

export const TabItemContact: TabItem = ({ tab, handleClose, handleSelect }) => {
  return (
    <TabItemBase
      icon={<Contact2Icon className="w-4 h-4" />}
      title={"Contacts"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentContact({ tab }: { tab: Tab }) {
  if (tab.type !== "contacts") {
    return null;
  }

  return (
    <div className="h-[calc(100vh-44px)]">
      <ContactView tab={tab} />
    </div>
  );
}

function ContactView({ tab }: { tab: Tab }) {
  if (tab.type !== "contacts") {
    return null;
  }

  const updateContactsTabState = useTabs((state) => state.updateContactsTabState);

  const { selectedOrganization, selectedPerson, editingPerson, editingOrg, showNewOrg, sortOption } = tab.state;

  const setSelectedOrganization = (value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, selectedOrganization: value });
  };

  const setSelectedPerson = (value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, selectedPerson: value });
  };

  const setEditingPerson = (value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, editingPerson: value });
  };

  const setEditingOrg = (value: string | null) => {
    updateContactsTabState(tab, { ...tab.state, editingOrg: value });
  };

  const setShowNewOrg = (value: boolean) => {
    updateContactsTabState(tab, { ...tab.state, showNewOrg: value });
  };

  const setSortOption = (value: "alphabetical" | "oldest" | "newest") => {
    updateContactsTabState(tab, { ...tab.state, sortOption: value });
  };

  const organizationsData = persisted.UI.useResultTable(persisted.QUERIES.visibleOrganizations, persisted.STORE_ID);
  const humansData = persisted.UI.useResultTable(persisted.QUERIES.visibleHumans, persisted.STORE_ID);
  const selectedPersonData = persisted.UI.useRow("humans", selectedPerson ?? "", persisted.STORE_ID);

  // Get humans by organization if one is selected
  const humanIdsByOrg = persisted.UI.useSliceRowIds(
    persisted.INDEXES.humansByOrg,
    selectedOrganization ?? "",
    persisted.STORE_ID,
  );

  // Convert to arrays for rendering
  const organizations = Object.entries(organizationsData).map(([id, data]) => ({
    id,
    ...(data as any),
  }));

  const allHumans = Object.entries(humansData).map(([id, data]) => ({
    id,
    ...(data as any),
  }));

  // Filter humans by organization if selected
  const displayPeople = selectedOrganization
    ? allHumans.filter(h => humanIdsByOrg.includes(h.id))
    : allHumans;

  // Sort people based on selected option
  const sortedPeople = [...displayPeople].sort((a: any, b: any) => {
    if (sortOption === "alphabetical") {
      return (a.name || a.email || "").localeCompare(b.name || b.email || "");
    } else if (sortOption === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  // Get sessions - for now just an empty array, we'll implement this later
  const personSessions: any[] = [];

  const handleSessionClick = (_sessionId: string) => {
    // Handle session click
  };

  const handleEditPerson = (personId: string) => {
    setEditingPerson(personId);
  };

  const handleEditOrganization = (organizationId: string) => {
    setEditingOrg(organizationId);
  };

  const handleDeletePerson = async (_personId: string) => {
    // Handle delete person
  };

  const getInitials = (name: string | null) => {
    if (!name) {
      return "?";
    }
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full">
      <OrganizationsColumn
        selectedOrganization={selectedOrganization}
        setSelectedOrganization={setSelectedOrganization}
        showNewOrg={showNewOrg}
        setShowNewOrg={setShowNewOrg}
        editingOrg={editingOrg}
        setEditingOrg={setEditingOrg}
        organizations={organizations}
        handleEditOrganization={handleEditOrganization}
      />

      <PeopleColumn
        displayPeople={sortedPeople}
        selectedPerson={selectedPerson}
        setSelectedPerson={setSelectedPerson}
        sortOption={sortOption}
        setSortOption={setSortOption}
        getInitials={getInitials}
      />

      <DetailsColumn
        selectedPersonData={selectedPersonData}
        editingPerson={editingPerson}
        setEditingPerson={setEditingPerson}
        organizations={organizations}
        personSessions={personSessions}
        handleEditPerson={handleEditPerson}
        handleDeletePerson={handleDeletePerson}
        handleSessionClick={handleSessionClick}
        getInitials={getInitials}
      />
    </div>
  );
}

function OrganizationsColumn({
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

function PeopleColumn({
  displayPeople,
  selectedPerson,
  setSelectedPerson,
  sortOption,
  setSortOption,
  getInitials,
}: {
  displayPeople: any[];
  selectedPerson: string | null;
  setSelectedPerson: (id: string | null) => void;
  sortOption: "alphabetical" | "oldest" | "newest";
  setSortOption: (option: "alphabetical" | "oldest" | "newest") => void;
  getInitials: (name: string | null) => string;
}) {
  return (
    <div className="w-[250px] border-r border-neutral-200 flex flex-col">
      <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between h-12">
        <h3 className="text-xs font-medium text-neutral-600">People</h3>
        <div className="flex items-center gap-1">
          <Select
            value={sortOption}
            onValueChange={(value: "alphabetical" | "oldest" | "newest") => setSortOption(value)}
          >
            <SelectTrigger className="w-[90px] h-6 text-xs border-0 bg-transparent hover:bg-neutral-100 focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical" className="text-xs">
                A-Z
              </SelectItem>
              <SelectItem value="oldest" className="text-xs">
                Oldest
              </SelectItem>
              <SelectItem value="newest" className="text-xs">
                Newest
              </SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => {
              // Handle add person
            }}
            className="p-0.5 rounded hover:bg-neutral-100 transition-colors"
          >
            <Plus className="h-3 w-3 text-neutral-500" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {displayPeople.map((person: any) => (
            <button
              key={person.id}
              onClick={() => setSelectedPerson(person.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 transition-colors flex items-center gap-2",
                selectedPerson === person.id && "bg-neutral-100",
              )}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                <span className="text-xs font-medium text-neutral-600">
                  {getInitials(person.name || person.email)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-1">
                  {person.name || person.email || "Unnamed"}
                  {person.is_user && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">You</span>
                  )}
                </div>
                {person.email && person.name && <div className="text-xs text-neutral-500 truncate">{person.email}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailsColumn({
  selectedPersonData,
  editingPerson,
  setEditingPerson,
  organizations,
  personSessions,
  handleEditPerson,
  handleDeletePerson,
  handleSessionClick,
  getInitials,
}: {
  selectedPersonData: any;
  editingPerson: string | null;
  setEditingPerson: (id: string | null) => void;
  organizations: any[];
  personSessions: any[];
  handleEditPerson: (id: string) => void;
  handleDeletePerson: (id: string) => void;
  handleSessionClick: (id: string) => void;
  getInitials: (name: string | null) => string;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {selectedPersonData
        ? (
          editingPerson === selectedPersonData.id
            ? (
              <EditPersonForm
                person={selectedPersonData}
                organizations={organizations}
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
                          {!selectedPersonData.is_user && selectedPersonData.email && (
                            <button
                              onClick={() => {
                                // Handle recommend
                              }}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                            >
                              <UserPlus className="h-3 w-3" />
                              Recommend Hyprnote to {selectedPersonData.name}
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPerson(selectedPersonData.id)}
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
                                handleDeletePerson(selectedPersonData.id);
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
  person,
  organizations: _organizations,
  onSave,
  onCancel,
}: {
  person: any;
  organizations: any[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const personData = persisted.UI.useRow("humans", person.id, persisted.STORE_ID);

  const getInitials = (name: string | null) => {
    if (!name) {
      return "?";
    }
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!personData) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Contact</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              variant="ghost"
              size="sm"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 mb-3 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xl font-semibold text-gray-600">
              {getInitials(personData.name as string || "?")}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <EditPersonNameField personId={person.id} />
          <EditPersonJobTitleField personId={person.id} />

          <div className="flex items-center px-4 py-3 border-b border-gray-200">
            <div className="w-28 text-sm text-gray-500">Company</div>
            <div className="flex-1">
              <EditPersonOrganizationSelector personId={person.id} />
            </div>
          </div>

          <EditPersonEmailField personId={person.id} />
          <EditPersonLinkedInField personId={person.id} />
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
    <div className="flex items-center px-4 py-3 border-b border-gray-200">
      <div className="w-28 text-sm text-gray-500">Name</div>
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
    <div className="flex items-center px-4 py-3 border-b border-gray-200">
      <div className="w-28 text-sm text-gray-500">Job Title</div>
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
    <div className="flex items-center px-4 py-3 border-b border-gray-200">
      <div className="w-28 text-sm text-gray-500">Email</div>
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
    <div className="flex items-center px-4 py-3 border-b border-gray-200">
      <div className="w-28 text-sm text-gray-500">LinkedIn</div>
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
                <span className="ml-2 text-gray-400 group">
                  <CircleMinus
                    className="size-4 cursor-pointer text-gray-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveOrganization();
                    }}
                  />
                </span>
              </div>
            )
            : <span className="text-gray-500 text-base">Select organization</span>}
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
    // Handle submit
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Handle enter
    }
  };

  const selectOrganization = (orgId: string) => {
    onChange(orgId);
    closePopover();
  };

  return (
    <div className="flex flex-col gap-3 max-w-[450px]">
      <div className="text-sm font-medium text-gray-700">Organization</div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-gray-50 border border-gray-200">
            <span className="text-gray-500 flex-shrink-0">
              <SearchIcon className="size-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or add company"
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {searchTerm.trim() && (
            <div className="flex flex-col w-full rounded border border-gray-200 overflow-hidden">
              {organizations.map((org: any) => (
                <button
                  key={org.id}
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors w-full"
                  onClick={() => selectOrganization(org.id)}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-gray-100 rounded-full">
                    <Building2 className="size-3" />
                  </span>
                  <span className="font-medium truncate">{org.name}</span>
                </button>
              ))}

              {organizations.length === 0 && (
                <button
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors w-full"
                  onClick={() => {}}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-gray-200 rounded-full">
                    <span className="text-xs">+</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-gray-600">
                    Create
                    <span className="text-gray-900 truncate max-w-[140px]">
                      &quot;{searchTerm.trim()}&quot;
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}

          {!searchTerm.trim() && organizations.length > 0 && (
            <div className="flex flex-col w-full rounded border border-gray-200 overflow-hidden max-h-[40vh] overflow-y-auto custom-scrollbar">
              {organizations.map((org: any) => (
                <button
                  key={org.id}
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors w-full"
                  onClick={() => selectOrganization(org.id)}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-gray-100 rounded-full">
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

function EditOrganizationForm({
  organization,
  onSave,
  onCancel,
}: {
  organization: any;
  onSave: () => void;
  onCancel: () => void;
}) {
  const name = persisted.UI.useCell("organizations", organization.id, "name", persisted.STORE_ID) as string;

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
