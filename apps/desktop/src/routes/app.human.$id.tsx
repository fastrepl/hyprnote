import { Trans, useLingui } from "@lingui/react/macro";
import { RiLinkedinFill } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { Building, Calendar, CircleMinus, ExternalLink, FileText, Globe, Mail, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import RightPanel from "@/components/right-panel";
import { useEditMode } from "@/contexts/edit-mode-context";
import { commands as dbCommands, type Human, type Organization, type Session } from "@hypr/plugin-db";
import { commands as windowsCommands, getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import { Input } from "@hypr/ui/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { extractWebsiteUrl, getInitials } from "@hypr/utils";

export const Route = createFileRoute("/app/human/$id")({
  component: Component,
  loader: async ({ context: { queryClient }, params }) => {
    const human = await queryClient.fetchQuery({
      queryKey: ["human", params.id],
      queryFn: () => dbCommands.getHuman(params.id),
    });

    if (!human) {
      throw notFound();
    }

    if (!human.organization_id) {
      return { human, organization: null };
    }

    const organization = await queryClient.fetchQuery({
      queryKey: ["organization", human.organization_id],
      queryFn: () => dbCommands.getOrganization(human.organization_id!),
    });

    return { human, organization };
  },
});

function Component() {
  const { human, organization } = Route.useLoaderData();
  const { isEditing, setIsEditing } = useEditMode();
  const [editedHuman, setEditedHuman] = useState<Human>(human);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [showOrgSearch, setShowOrgSearch] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLingui();
  const orgSearchRef = useRef<HTMLDivElement>(null);

  const isMain = getCurrentWebviewWindowLabel() === "main";

  const getOrganizationWebsite = () => {
    return organization ? extractWebsiteUrl(human.email) : null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedHuman(prev => ({ ...prev, [name]: value }));
  };

  // Handle clicks outside the organization search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgSearchRef.current && !orgSearchRef.current.contains(event.target as Node)) {
        setShowOrgSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search for organizations based on the query
  const { data: orgSearchResults = [] } = useQuery({
    queryKey: ["search-organizations", orgSearchQuery],
    queryFn: async () => {
      if (!orgSearchQuery.trim()) return [];
      return dbCommands.listOrganizations({ search: [4, orgSearchQuery] });
    },
    enabled: !!orgSearchQuery.trim() && showOrgSearch,
  });

  // Mutation to update the human's organization
  const updateOrgMutation = useMutation({
    mutationFn: async (organizationId: string | null) => {
      const updatedHuman = { ...editedHuman, organization_id: organizationId };
      await dbCommands.upsertHuman(updatedHuman);
      return updatedHuman;
    },
    onSuccess: (updatedHuman) => {
      setEditedHuman(updatedHuman);
      queryClient.invalidateQueries({ queryKey: ["human", human.id] });
      setOrgSearchQuery("");
      setShowOrgSearch(false);
    },
  });

  // Update edited human when isEditing changes to false (save is clicked)
  useEffect(() => {
    if (!isEditing) {
      // Save changes
      try {
        // Update human data
        dbCommands.upsertHuman(editedHuman);
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["human", human.id] });
      } catch (error) {
        console.error("Failed to update human:", error);
      }
    }
  }, [isEditing, editedHuman, human.id, queryClient]);

  // Reset form when human data changes
  useEffect(() => {
    setEditedHuman(human);
  }, [human]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-auto flex flex-col">
        <main className="bg-white flex-1 overflow-auto relative">
          {isMain && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    // Save changes
                    try {
                      dbCommands.upsertHuman(editedHuman);
                      queryClient.invalidateQueries({ queryKey: ["human", human.id] });
                    } catch (error) {
                      console.error("Failed to update human:", error);
                    }
                  }
                  setIsEditing(!isEditing);
                }}
              >
                {isEditing ? "Save" : "Edit"}
              </Button>
            </div>
          )}
          <div className="max-w-lg mx-auto px-4 lg:px-6 pt-6 pb-20">
            <div className="mb-6 flex flex-col items-center gap-8">
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-xl font-medium">
                    {getInitials(human.full_name || "")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col items-start gap-1">
                  {isEditing
                    ? (
                      <div className="w-full space-y-2">
                        <Input
                          id="full_name"
                          name="full_name"
                          value={editedHuman.full_name || ""}
                          onChange={handleInputChange}
                          placeholder="Full Name"
                          className="text-lg font-medium border-none shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <Input
                          id="job_title"
                          name="job_title"
                          value={editedHuman.job_title || ""}
                          onChange={handleInputChange}
                          placeholder="Job Title"
                          className="text-sm border-none shadow-none px-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <div className="flex items-center gap-2">
                          {organization
                            ? (
                              <div className="flex items-center gap-2 w-full">
                                <div className="text-sm text-gray-700 flex-1">{organization.name}</div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditedHuman(prev => ({ ...prev, organization_id: null }));
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <CircleMinus className="size-4" />
                                </button>
                              </div>
                            )
                            : (
                              <div className="w-full" ref={orgSearchRef}>
                                <div className="flex items-center">
                                  <input
                                    type="text"
                                    value={orgSearchQuery}
                                    onChange={(e) => {
                                      setOrgSearchQuery(e.target.value);
                                      setShowOrgSearch(true);
                                    }}
                                    onFocus={() => setShowOrgSearch(true)}
                                    placeholder={t`Organization`}
                                    className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400 border-none shadow-none px-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                </div>

                                {showOrgSearch && orgSearchQuery.trim() && (
                                  <div className="relative">
                                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md border border-border overflow-hidden">
                                      {orgSearchResults?.length > 0 && (
                                        <div className="max-h-60 overflow-auto">
                                          {orgSearchResults.map((org) => (
                                            <button
                                              key={org.id}
                                              type="button"
                                              className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
                                              onClick={() => {
                                                setEditedHuman(prev => ({ ...prev, organization_id: org.id }));
                                                setOrgSearchQuery("");
                                                setShowOrgSearch(false);
                                              }}
                                            >
                                              <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-blue-100 text-blue-600 rounded-full">
                                                <Building className="size-3" />
                                              </span>
                                              <span className="font-medium text-neutral-900 truncate">{org.name}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}

                                      {(!orgSearchResults?.length) && (
                                        <button
                                          type="button"
                                          className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
                                          onClick={async () => {
                                            try {
                                              // Create the new organization
                                              const newOrg: Organization = {
                                                id: crypto.randomUUID(),
                                                name: orgSearchQuery.trim(),
                                                description: null,
                                              };

                                              // Save to database
                                              await dbCommands.upsertOrganization(newOrg);

                                              // Update the human with the new organization
                                              setEditedHuman(prev => ({ ...prev, organization_id: newOrg.id }));

                                              // Clear search
                                              setOrgSearchQuery("");
                                              setShowOrgSearch(false);
                                            } catch (error) {
                                              console.error("Failed to create organization:", error);
                                            }
                                          }}
                                        >
                                          <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-200 rounded-full">
                                            <Plus className="size-3" />
                                          </span>
                                          <span className="flex items-center gap-1 font-medium text-neutral-600">
                                            <Trans>Create</Trans>
                                            <span className="text-neutral-900 truncate max-w-[140px]">
                                              &quot;{orgSearchQuery.trim()}&quot;
                                            </span>
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    )
                    : (
                      <>
                        <h1 className="text-lg font-medium">
                          {human.full_name || <Trans>Unnamed Contact</Trans>}
                        </h1>
                        {human.job_title && <div className="text-sm text-gray-700">{human.job_title}</div>}
                      </>
                    )}
                  {organization && !isEditing && (
                    <button
                      className="text-sm font-medium text-gray-700 flex items-center gap-1 hover:scale-95 transition-all hover:text-neutral-900"
                      onClick={() => windowsCommands.windowShow({ organization: organization.id })}
                    >
                      <Building size={14} />
                      {organization.name}
                    </button>
                  )}
                </div>
              </div>

              {isEditing
                ? (
                  <div className="w-full">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 pr-4 w-1/3 text-sm font-medium text-gray-500">
                            <div className="flex items-center gap-2">
                              <Mail className="size-4 text-gray-400" />
                              <span>Email</span>
                            </div>
                          </td>
                          <td className="py-2">
                            <Input
                              id="email"
                              name="email"
                              value={editedHuman.email || ""}
                              onChange={handleInputChange}
                              placeholder="Email Address"
                              className="border-none text-sm shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 w-1/3 text-sm font-medium text-gray-500">
                            <div className="flex items-center gap-2">
                              <RiLinkedinFill className="size-4 text-gray-400" />
                              <span>LinkedIn</span>
                            </div>
                          </td>
                          <td className="py-2">
                            <Input
                              id="linkedin_username"
                              name="linkedin_username"
                              value={editedHuman.linkedin_username || ""}
                              onChange={handleInputChange}
                              placeholder="LinkedIn Username"
                              className="border-none text-sm shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
                : (
                  <div className="flex justify-center gap-4">
                    {human.email && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a href={`mailto:${human.email}`}>
                              <Button
                                variant="outline"
                                size="icon"
                              >
                                <Mail className="h-5 w-5" />
                              </Button>
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">{human.email}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {human.linkedin_username && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={`https://linkedin.com/in/${human.linkedin_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="outline"
                                size="icon"
                              >
                                <RiLinkedinFill className="h-5 w-5" />
                              </Button>
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">LinkedIn: {human.linkedin_username}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {organization && getOrganizationWebsite() !== null && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={getOrganizationWebsite()!}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="outline"
                                size="icon"
                              >
                                <Globe className="h-5 w-5" />
                              </Button>
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">{organization.name} Website</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
            </div>
            <UpcomingEvents human={human} />
            <PastNotes human={human} />
          </div>
        </main>
      </div>
      <RightPanel />
    </div>
  );
}

function UpcomingEvents({ human }: { human: Human }) {
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["events", "upcoming", human.id],
    queryFn: async () => {
      const now = new Date();
      const startDate = now.toISOString();

      const endDate = new Date(now);
      endDate.setMonth(now.getMonth() + 3);

      const events = await dbCommands.listEvents({
        user_id: human.id,
        limit: 5,
        type: "dateRange",
        start: startDate,
        end: endDate.toISOString(),
      });

      return events;
    },
  });

  return (
    <div className="mt-8">
      <h2 className="mb-4 font-semibold text-zinc-800 flex items-center gap-2">
        <Calendar className="size-5" />
        <span>Upcoming Events</span>
      </h2>
      {upcomingEvents.length > 0
        ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200 shadow-sm rounded-lg"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-zinc-900">{event.name}</h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        {format(new Date(event.start_date), "MMMM do, yyyy")} •{" "}
                        {format(new Date(event.start_date), "h:mm a")} - {format(new Date(event.end_date), "h:mm a")}
                      </p>
                      {event.note && <p className="mt-2 text-sm text-zinc-600">{event.note}</p>}
                    </div>
                    {event.google_event_url && (
                      <a
                        href={event.google_event_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 hover:text-zinc-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
        : (
          <p className="text-zinc-500">
            <Trans>No upcoming events with this contact</Trans>
          </p>
        )}
    </div>
  );
}

function PastNotes({ human }: { human: Human }) {
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", "human", human.id],
    queryFn: async () => {
      const allSessions = await dbCommands.listSessions({
        user_id: human.id,
        limit: 10,
        type: "recentlyVisited",
      });

      const sessionsWithHuman = await Promise.all(
        allSessions.map(async (session) => {
          const participants = await dbCommands.sessionListParticipants(session.id);
          const hasHuman = participants.some((p) => p.id === human.id);
          return hasHuman ? session : null;
        }),
      );

      return sessionsWithHuman.filter((s): s is Session => s !== null);
    },
  });

  return (
    <div className="mt-12">
      <h2 className="mb-4 font-semibold text-zinc-800 flex items-center gap-2">
        <FileText className="size-5" />
        <span>Past Notes</span>
      </h2>
      {sessions.length > 0
        ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to="/app/note/$id"
                params={{ id: session.id }}
                className="block"
              >
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200 shadow-sm rounded-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-900">{session.title}</h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          {format(new Date(session.created_at), "MMMM do, yyyy")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
        : (
          <p className="text-zinc-500">
            <Trans>No past notes with this contact</Trans>
          </p>
        )}
    </div>
  );
}
