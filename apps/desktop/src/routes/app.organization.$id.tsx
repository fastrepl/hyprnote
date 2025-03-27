import { Trans } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, ExternalLink, FileText, Users } from "lucide-react";
import { useEffect, useState } from "react";

import RightPanel from "@/components/right-panel";
import { useEditMode } from "@/contexts/edit-mode-context";
import { commands as dbCommands } from "@hypr/plugin-db";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { getInitials } from "@hypr/utils";
import { commands as windowsCommands } from "@hypr/plugin-windows";

export const Route = createFileRoute("/app/organization/$id")({
  component: Component,
  loader: async ({ context: { queryClient }, params }) => {
    const organization = await queryClient.fetchQuery({
      queryKey: ["organization", params.id],
      queryFn: () => dbCommands.getOrganization(params.id),
    });

    if (!organization) {
      throw notFound();
    }

    return { organization };
  },
});

function Component() {
  const { organization } = Route.useLoaderData();
  const { isEditing, setIsEditing } = useEditMode();
  const [editedOrganization, setEditedOrganization] = useState(organization);
  const queryClient = useQueryClient();

  const isMain = getCurrentWebviewWindowLabel() === "main";

  const { data: members = [] } = useQuery({
    queryKey: ["organization", organization.id, "members"],
    queryFn: () => dbCommands.listOrganizationMembers(organization.id),
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["events", "upcoming", "organization", organization.id],
    queryFn: async () => {
      const now = new Date();
      const startDate = now.toISOString();

      const endDate = new Date(now);
      endDate.setMonth(now.getMonth() + 3);

      const memberEvents = await Promise.all(
        members.map(async (member) => {
          const events = await dbCommands.listEvents({
            user_id: member.id,
            limit: 5,
            type: "dateRange",
            start: startDate,
            end: endDate.toISOString(),
          });
          return events;
        }),
      );

      const allEvents = memberEvents.flat();
      const uniqueEvents = Array.from(
        new Map(allEvents.map(event => [event.id, event])).values(),
      );

      return uniqueEvents.slice(0, 10);
    },
    enabled: members.length > 0,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", "organization", organization.id],
    queryFn: async () => {
      const memberSessions = await Promise.all(
        members.map(async (member) => {
          const sessions = await dbCommands.listSessions({
            user_id: member.id,
            limit: 5,
            type: "recentlyVisited",
          });
          return sessions;
        }),
      );

      const allSessions = memberSessions.flat();
      const uniqueSessions = Array.from(
        new Map(allSessions.map(session => [session.id, session])).values(),
      );

      return uniqueSessions.slice(0, 10);
    },
    enabled: members.length > 0,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedOrganization(prev => ({ ...prev, [name]: value }));
  };

  // Update edited organization when isEditing changes to false (save is clicked)
  useEffect(() => {
    if (!isEditing) {
      // Save changes
      try {
        // Uncomment and use the appropriate API when available
        // await dbCommands.updateOrganization(organization.id, editedOrganization);
        console.log("Would save organization:", editedOrganization);
      } catch (error) {
        console.error("Failed to update organization:", error);
      }
    }
  }, [isEditing, editedOrganization, organization.id]);

  // Reset form when organization data changes
  useEffect(() => {
    setEditedOrganization(organization);
  }, [organization]);

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
                      dbCommands.upsertOrganization(editedOrganization);
                      queryClient.invalidateQueries({ queryKey: ["organization", organization.id] });
                    } catch (error) {
                      console.error("Failed to update organization:", error);
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
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-xl font-medium bg-blue-100 text-blue-600">
                      {getInitials(organization.name || "")}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex flex-col items-start gap-1">
                  {isEditing
                    ? (
                      <div className="w-full">
                        <Input
                          id="name"
                          name="name"
                          value={editedOrganization.name || ""}
                          onChange={handleInputChange}
                          placeholder="Organization Name"
                          className="text-lg font-medium border-none shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <Textarea
                          id="description"
                          name="description"
                          value={editedOrganization.description || ""}
                          onChange={handleInputChange}
                          placeholder="Organization Description"
                          className="text-sm border-none shadow-none px-0 min-h-[60px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    )
                    : (
                      <>
                        <h1 className="text-lg font-medium">
                          {organization.name || <Trans>Unnamed Organization</Trans>}
                        </h1>
                        {organization.description && (
                          <div className="text-sm text-gray-700">{organization.description}</div>
                        )}
                      </>
                    )}
                </div>
              </div>

              <div className="flex justify-center gap-4">
              </div>
            </div>

            {members.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Users className="size-5" />
                  <Trans>Members</Trans>
                  <span className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {members.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {members.slice(0, 5).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => windowsCommands.windowShow({ human: member.id })}
                      className="flex items-center p-2 rounded-md hover:bg-muted w-full text-left"
                    >
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.full_name || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.full_name}</p>
                        {member.job_title && <p className="text-xs text-muted-foreground">{member.job_title}</p>}
                      </div>
                    </button>
                  ))}
                  {members.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      <Trans>and {members.length - 5} more members</Trans>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Calendar className="size-5" />
                <Trans>Upcoming Events</Trans>
              </h2>
              {upcomingEvents.length > 0
                ? (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <Card key={event.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium">{event.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(event.start_date), "PPP")} • {format(new Date(event.start_date), "p")}
                                {" "}
                                - {format(new Date(event.end_date), "p")}
                              </p>
                              {event.note && <p className="mt-2 text-sm">{event.note}</p>}
                            </div>
                            {event.google_event_url && (
                              <a
                                href={event.google_event_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
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
                  <p className="text-muted-foreground">
                    <Trans>No upcoming events for this organization</Trans>
                  </p>
                )}
            </div>

            <div className="mt-8">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <FileText className="size-5" />
                <Trans>Recent Notes</Trans>
              </h2>
              {sessions.length > 0
                ? (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <Card key={session.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium">{session.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(session.created_at), "PPP")}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2"
                            >
                              <Link to="/app/note/$id" params={{ id: session.id }}>
                                <Trans>View Note</Trans>
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
                : (
                  <p className="text-muted-foreground">
                    <Trans>No recent notes for this organization</Trans>
                  </p>
                )}
            </div>
          </div>
        </main>
      </div>
      <RightPanel />
    </div>
  );
}
