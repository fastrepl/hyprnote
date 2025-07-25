import { useState, useEffect } from "react";
import { commands as dbCommands } from "@hypr/plugin-db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@hypr/ui/lib/utils";
import { Building2, User, Calendar, FileText, Pencil, X, Check, Mail, Briefcase, LinkedinIcon, Plus, CircleMinus, SearchIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { type Organization, type Human, type Session } from "@hypr/plugin-db";
import { Input } from "@hypr/ui/components/ui/input";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { toast } from "sonner";
import { getInitials } from "@hypr/utils";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations", userId],
    queryFn: () => dbCommands.listOrganizations(null),
  });

  const { data: people = [] } = useQuery({
    queryKey: ["organization-members", selectedOrganization],
    queryFn: () => selectedOrganization ? dbCommands.listOrganizationMembers(selectedOrganization) : Promise.resolve([]),
    enabled: !!selectedOrganization,
  });

  const { data: allPeople = [] } = useQuery({
    queryKey: ["all-people", userId],
    queryFn: async () => {
      try {
        // Pass an empty search to get all humans
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
      if (!selectedPerson) return [];
      
      // Get all sessions for the user
      const sessions = await dbCommands.listSessions({
        type: "search",
        query: "",
        user_id: userId,
        limit: 100,
      });
      
      // For each session, check if the person is a participant
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

  useEffect(() => {
    // Only auto-select first organization if we don't have any initial selections
    // and the user hasn't explicitly selected "All People" (selectedOrganization === null)
    if (selectedOrganization === undefined && organizations.length > 0 && !initialOrgId && !initialPersonId) {
      // Don't auto-select, let the user choose
      setSelectedOrganization(null);
    }
  }, [organizations, initialOrgId, initialPersonId]);

  // Handle initial person selection
  useEffect(() => {
    if (initialPersonId && allPeople.length > 0) {
      const person = allPeople.find(p => p.id === initialPersonId);
      if (person) {
        setSelectedPerson(initialPersonId);
        // If person has an organization, select it
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
    const url = `/app/note/${sessionId}`;
    windowsCommands.windowShow({ type: "main" }).then(() => {
      windowsCommands.windowEmitNavigate({ type: "main" }, url);
    });
  };

  const handleEditPerson = (personId: string) => {
    setEditingPerson(personId);
  };

  const handleEditOrganization = (organizationId: string) => {
    setEditingOrg(organizationId);
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
                !selectedOrganization && "bg-neutral-100"
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
              editingOrg === org.id ? (
                <EditOrganizationForm
                  key={org.id}
                  organization={org}
                  onSave={() => setEditingOrg(null)}
                  onCancel={() => setEditingOrg(null)}
                />
              ) : (
                <div
                  key={org.id}
                  className={cn(
                    "group relative rounded-md transition-colors",
                    selectedOrganization === org.id && "bg-neutral-100"
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
                  selectedPerson === person.id && "bg-neutral-100"
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
        {selectedPersonData ? (
          editingPerson === selectedPersonData.id ? (
            <EditPersonForm
              person={selectedPersonData}
              organizations={organizations}
              onSave={() => setEditingPerson(null)}
              onCancel={() => setEditingPerson(null)}
            />
          ) : (
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
                        <h2 className="text-lg font-semibold">{selectedPersonData.full_name || "Unnamed Contact"}</h2>
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
                      <button
                        onClick={() => handleEditPerson(selectedPersonData.id)}
                        className="p-2 rounded-md hover:bg-neutral-100 transition-colors"
                      >
                        <Pencil className="h-4 w-4 text-neutral-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            <div className="flex-1 p-6">
              <h3 className="text-sm font-medium text-neutral-600 mb-4">Related Notes</h3>
              <div className="h-full overflow-y-auto">
                <div className="space-y-2">
                  {personSessions.length > 0 ? (
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
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.created_at).toLocaleDateString()}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500">No related notes found</p>
                  )}
                </div>
              </div>
            </div>
            </>
          )
        ) : (
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

  if (!organization) return null;

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
  onCancel 
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
    organization_id: person.organization_id
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
      toast.success("Contact updated successfully");
      onSave();
    },
    onError: () => {
      toast.error("Failed to update contact");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePersonMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Contact</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updatePersonMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1.5">
            <User className="h-4 w-4" />
            Full Name
          </label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="John Doe"
            className="w-full"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1.5">
            <Mail className="h-4 w-4" />
            Email
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
            className="w-full"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1.5">
            <Briefcase className="h-4 w-4" />
            Job Title
          </label>
          <Input
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            placeholder="Software Engineer"
            className="w-full"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1.5">
            <Building2 className="h-4 w-4" />
            Organization
          </label>
          <OrganizationSelector 
            value={formData.organization_id}
            onChange={(orgId) => setFormData({ ...formData, organization_id: orgId })}
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1.5">
            <LinkedinIcon className="h-4 w-4" />
            LinkedIn
          </label>
          <Input
            value={formData.linkedin_username}
            onChange={(e) => setFormData({ ...formData, linkedin_username: e.target.value })}
            placeholder="linkedin.com/in/johndoe"
            className="w-full"
          />
        </div>
      </div>
    </form>
  );
}

function OrganizationSelector({ 
  value, 
  onChange 
}: { 
  value: string | null;
  onChange: (orgId: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: selectedOrg } = useQuery({
    queryKey: ["organization", value],
    queryFn: () => (value ? dbCommands.getOrganization(value) : null),
    enabled: !!value,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-search", searchTerm],
    queryFn: () => {
      if (!searchTerm) {
        return dbCommands.listOrganizations(null);
      }
      return dbCommands.listOrganizations({ search: [5, searchTerm] });
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const newOrg = await dbCommands.upsertOrganization({
        id: crypto.randomUUID(),
        name,
        description: null,
      });
      return newOrg;
    },
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onChange(org.id);
      setOpen(false);
      setSearchTerm("");
    },
  });

  const handleRemoveOrganization = () => {
    onChange(null);
  };

  const selectOrganization = (orgId: string) => {
    onChange(orgId);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = searchTerm.trim();
      if (name !== "") {
        createOrgMutation.mutate({ name });
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center justify-between w-full px-3 py-2 border border-neutral-200 rounded-md text-sm cursor-pointer hover:bg-neutral-50">
          {selectedOrg ? (
            <div className="flex items-center justify-between w-full">
              <span>{selectedOrg.name}</span>
              <CircleMinus
                className="h-4 w-4 text-neutral-400 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveOrganization();
                }}
              />
            </div>
          ) : (
            <span className="text-neutral-500">Select organization</span>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-3" align="start" side="bottom">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-neutral-50 border border-neutral-200">
            <SearchIcon className="h-4 w-4 text-neutral-500 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or add company"
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
              autoFocus
            />
          </div>

          {searchTerm.trim() && (
            <div className="rounded border border-neutral-200 overflow-hidden">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-neutral-100 w-full"
                  onClick={() => selectOrganization(org.id)}
                >
                  <Building2 className="h-4 w-4 text-neutral-500" />
                  <span className="truncate">{org.name}</span>
                </button>
              ))}
              {organizations.length === 0 && (
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-neutral-100 w-full"
                  onClick={() => createOrgMutation.mutate({ name: searchTerm.trim() })}
                >
                  <Plus className="h-4 w-4 text-neutral-500" />
                  <span>Create "{searchTerm.trim()}"</span>
                </button>
              )}
            </div>
          )}

          {!searchTerm.trim() && organizations.length > 0 && (
            <div className="rounded border border-neutral-200 overflow-hidden max-h-[200px] overflow-y-auto">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-neutral-100 w-full"
                  onClick={() => selectOrganization(org.id)}
                >
                  <Building2 className="h-4 w-4 text-neutral-500" />
                  <span className="truncate">{org.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EditOrganizationForm({ 
  organization, 
  onSave, 
  onCancel 
}: { 
  organization: Organization;
  onSave: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: organization.name,
    description: organization.description || ""
  });

  const updateOrgMutation = useMutation({
    mutationFn: (data: Partial<Organization>) => 
      dbCommands.upsertOrganization({
        ...organization,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", organization.id] });
      toast.success("Organization updated");
      onSave();
    },
    onError: () => {
      toast.error("Failed to update organization");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-2">
      <div className="bg-white border border-neutral-200 rounded-md p-3 space-y-2">
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Organization name"
          className="text-sm h-8"
          autoFocus
        />
        <div className="flex gap-1">
          <Button
            type="submit"
            size="sm"
            className="h-7 text-xs"
            disabled={updateOrgMutation.isPending || !formData.name.trim()}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onCancel}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </form>
  );
}

function NewOrganizationForm({ 
  onSave, 
  onCancel 
}: { 
  onSave: (org: Organization) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const createOrgMutation = useMutation({
    mutationFn: (name: string) => 
      dbCommands.upsertOrganization({
        id: crypto.randomUUID(),
        name,
        description: null,
      }),
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created");
      onSave(org);
    },
    onError: () => {
      toast.error("Failed to create organization");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createOrgMutation.mutate(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-2">
      <div className="bg-white border border-neutral-200 rounded-md p-3 space-y-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New organization name"
          className="text-sm h-8"
          autoFocus
        />
        <div className="flex gap-1">
          <Button
            type="submit"
            size="sm"
            className="h-7 text-xs"
            disabled={createOrgMutation.isPending || !name.trim()}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onCancel}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </form>
  );
}