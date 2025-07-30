import { RiCornerDownLeftLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CircleMinus, FileText, Pencil, Plus, SearchIcon, TrashIcon, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { type Human, type Organization } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/ui/lib/utils";
import { getInitials } from "@hypr/utils";
import { LinkProps } from "node_modules/@tanstack/react-router/dist/esm/link";

interface ContactViewProps {
  userId: string;
  initialPersonId?: string;
  initialOrgId?: string;
}

export function ContactView({ userId, initialPersonId, initialOrgId }: ContactViewProps) {
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(initialOrgId || null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(initialPersonId || null);
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [showNewOrg, setShowNewOrg] = useState(false);
  const queryClient = useQueryClient();

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations", userId],
    queryFn: () => dbCommands.listOrganizations(null),
  });

  const { data: people = [] } = useQuery({
    queryKey: ["organization-members", selectedOrganization],
    queryFn: () =>
      selectedOrganization ? dbCommands.listOrganizationMembers(selectedOrganization) : Promise.resolve([]),
    enabled: !!selectedOrganization,
  });

  const { data: allPeople = [] } = useQuery({
    queryKey: ["all-people", userId],
    queryFn: async () => {
      try {
        const allHumans = await dbCommands.listHumans({ search: [100, ""] });
        return allHumans;
      } catch (error) {
        console.error("Error fetching all people:", error);
        return [];
      }
    },
    enabled: !selectedOrganization,
  });

  const { data: personSessions = [] } = useQuery({
    queryKey: ["person-sessions", selectedPerson, userId],
    queryFn: async () => {
      if (!selectedPerson) {
        return [];
      }

      const sessions = await dbCommands.listSessions({
        type: "search",
        query: "",
        user_id: userId,
        limit: 100,
      });

      const sessionsWithPerson = [];
      for (const session of sessions) {
        try {
          const participants = await dbCommands.sessionListParticipants(session.id);
          if (participants.some(p => p.id === selectedPerson)) {
            sessionsWithPerson.push(session);
          }
        } catch (error) {
          console.error("Error fetching participants for session", session.id, error);
        }
      }

      return sessionsWithPerson;
    },
    enabled: !!selectedPerson,
  });

  const displayPeople = selectedOrganization ? people : allPeople;

  const selectedPersonData = displayPeople.find(p => p.id === selectedPerson);

  // Handle initial person selection
  useEffect(() => {
    if (initialPersonId && allPeople.length > 0) {
      const person = allPeople.find(p => p.id === initialPersonId);
      if (person) {
        setSelectedPerson(initialPersonId);
        if (person.organization_id) {
          setSelectedOrganization(person.organization_id);
        }
      }
    }
  }, [initialPersonId, allPeople]);

  // Handle initial organization selection
  useEffect(() => {
    if (initialOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === initialOrgId);
      if (org) {
        setSelectedOrganization(initialOrgId);
      }
    }
  }, [initialOrgId, organizations]);

  const handleSessionClick = (sessionId: string) => {
    const path = { to: "/app/note/$id", params: { id: sessionId } } as const satisfies LinkProps;

    windowsCommands.windowShow({ type: "main" }).then(() => {
      windowsCommands.windowEmitNavigate({ type: "main" }, {
        path: path.to.replace("$id", path.params.id),
        search: null,
      });
    });
  };

  const handleEditPerson = (personId: string) => {
    setEditingPerson(personId);
  };

  const handleEditOrganization = (organizationId: string) => {
    setEditingOrg(organizationId);
  };

  const deletePersonMutation = useMutation({
    mutationFn: (personId: string) => dbCommands.deleteHuman(personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-people"] });
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });

      if (selectedPerson === selectedPersonData?.id) {
        setSelectedPerson(null);
      }
    },
  });

  const handleDeletePerson = async (personId: string) => {
    const userConfirmed = await confirm(
      "Are you sure you want to delete this contact? This action cannot be undone.",
    );
    if (userConfirmed) {
      deletePersonMutation.mutate(personId);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-[200px] border-r border-neutral-200 flex flex-col">
        <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
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
                onSave={(org) => {
                  setShowNewOrg(false);
                  setSelectedOrganization(org.id);
                }}
                onCancel={() => setShowNewOrg(false)}
              />
            )}
            {organizations.map((org) => (
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
            ))}
          </div>
        </div>
      </div>

      <div className="w-[250px] border-r border-neutral-200 flex flex-col">
        <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-600">People</h3>
          <button
            onClick={() => {
              const newPersonId = crypto.randomUUID();
              dbCommands.upsertHuman({
                id: newPersonId,
                organization_id: selectedOrganization,
                is_user: false,
                full_name: null,
                email: null,
                job_title: null,
                linkedin_username: null,
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: ["all-people"] });
                queryClient.invalidateQueries({ queryKey: ["organization-members"] });
                setSelectedPerson(newPersonId);
                setEditingPerson(newPersonId);
              });
            }}
            className="p-0.5 rounded hover:bg-neutral-100 transition-colors"
          >
            <Plus className="h-3 w-3 text-neutral-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {displayPeople.map((person) => (
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
                    {getInitials(person.full_name || person.email)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{person.full_name || person.email || "Unnamed"}</div>
                  {person.email && person.full_name && (
                    <div className="text-xs text-neutral-500 truncate">{person.email}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

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
                          {getInitials(selectedPersonData.full_name || selectedPersonData.email)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-lg font-semibold">
                              {selectedPersonData.full_name || "Unnamed Contact"}
                            </h2>
                            {selectedPersonData.job_title && (
                              <p className="text-sm text-neutral-600">{selectedPersonData.job_title}</p>
                            )}
                            {selectedPersonData.email && (
                              <p className="text-sm text-neutral-500">{selectedPersonData.email}</p>
                            )}
                            {selectedPersonData.organization_id && (
                              <OrganizationInfo organizationId={selectedPersonData.organization_id} />
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
                                disabled={deletePersonMutation.isPending}
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
                    <div className="h-full overflow-y-auto">
                      <div className="space-y-2">
                        {personSessions.length > 0
                          ? (
                            personSessions.map((session) => (
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
    </div>
  );
}

function OrganizationInfo({ organizationId }: { organizationId: string }) {
  const { data: organization } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () => dbCommands.getOrganization(organizationId),
    enabled: !!organizationId,
  });

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
  organizations,
  onSave,
  onCancel,
}: {
  person: Human;
  organizations: Organization[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: person.full_name || "",
    email: person.email || "",
    job_title: person.job_title || "",
    linkedin_username: person.linkedin_username || "",
    organization_id: person.organization_id,
  });

  const updatePersonMutation = useMutation({
    mutationFn: (data: Partial<Human>) =>
      dbCommands.upsertHuman({
        ...person,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-people"] });
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      onSave();
    },
    onError: () => {
      console.error("Failed to update contact");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePersonMutation.mutate(formData);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
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
              onClick={handleSubmit}
              variant="ghost"
              size="sm"
              disabled={updatePersonMutation.isPending}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 mb-3 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xl font-semibold text-gray-600">
              {getInitials(formData.full_name || "?")}
            </span>
          </div>
        </div>

        {/* Form Section */}
        <div className="border-t border-gray-200">
          {/* Name Field */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200">
            <div className="w-28 text-sm text-gray-500">Name</div>
            <div className="flex-1">
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
                className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Job Title Field */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200">
            <div className="w-28 text-sm text-gray-500">Job Title</div>
            <div className="flex-1">
              <Input
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="Software Engineer"
                className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Company Field */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200">
            <div className="w-28 text-sm text-gray-500">Company</div>
            <div className="flex-1">
              <ContactOrganizationSelector
                value={formData.organization_id}
                onChange={(orgId) => setFormData({ ...formData, organization_id: orgId })}
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200">
            <div className="w-28 text-sm text-gray-500">Email</div>
            <div className="flex-1">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* LinkedIn Field */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200">
            <div className="w-28 text-sm text-gray-500">LinkedIn</div>
            <div className="flex-1">
              <Input
                value={formData.linkedin_username}
                onChange={(e) => setFormData({ ...formData, linkedin_username: e.target.value })}
                placeholder="https://www.linkedin.com/in/johntopia/"
                className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactOrganizationSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (orgId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const { data: organization } = useQuery({
    queryKey: ["org", value],
    queryFn: () => (value ? dbCommands.getOrganization(value) : null),
    enabled: !!value,
  });

  const handleRemoveOrganization = () => {
    onChange(null);
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
        <OrganizationControl onChange={onChange} closePopover={() => setOpen(false)} />
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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const addOrganizationMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const newOrg = await dbCommands.upsertOrganization({
        id: crypto.randomUUID(),
        name,
        description: null,
      });

      onChange(newOrg.id);
      return newOrg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });
      closePopover();
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations", searchTerm],
    queryFn: () => {
      if (!searchTerm) {
        return dbCommands.listOrganizations(null);
      }
      return dbCommands.listOrganizations({ search: [5, searchTerm] });
    },
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = searchTerm.trim();
    if (name === "") {
      return;
    }

    addOrganizationMutation.mutate({ name });
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const name = searchTerm.trim();
      if (name === "") {
        return;
      }

      addOrganizationMutation.mutate({ name });
      setSearchTerm("");
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
              {organizations.map((org) => (
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
                  onClick={() => addOrganizationMutation.mutate({ name: searchTerm.trim() })}
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
              {organizations.map((org) => (
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
  organization: Organization;
  onSave: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(organization.name);
  const formRef = useRef<HTMLDivElement>(null);

  const updateOrgMutation = useMutation({
    mutationFn: (data: Partial<Organization>) =>
      dbCommands.upsertOrganization({
        ...organization,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", organization.id] });
      onSave();
    },
    onError: () => {
      console.error("Failed to update organization");
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateOrgMutation.mutate({ name: name.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (name.trim()) {
        updateOrgMutation.mutate({ name: name.trim() });
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="p-2" ref={formRef}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Organization name"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
            autoFocus
          />
          {name.trim() && (
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
              aria-label="Save organization"
            >
              <RiCornerDownLeftLine className="size-4" />
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
  onSave: (org: Organization) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const createOrgMutation = useMutation({
    mutationFn: (name: string) =>
      dbCommands.upsertOrganization({
        id: crypto.randomUUID(),
        name,
        description: null,
      }),
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onSave(org);
    },
    onError: () => {
      console.error("Failed to create organization");
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createOrgMutation.mutate(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (name.trim()) {
        createOrgMutation.mutate(name.trim());
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="p-2" ref={formRef}>
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
              <RiCornerDownLeftLine className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
