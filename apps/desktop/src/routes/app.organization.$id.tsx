import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, ExternalLink, FileText, Users } from "lucide-react";

import RightPanel from "@/components/right-panel";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { extractWebsiteUrl, getInitials } from "@hypr/utils";

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

  const getOrganizationWebsite = () => {
    return extractWebsiteUrl(organization.description);
  };

  const { data: members = [] } = useQuery({
    queryKey: ["organization", organization.id, "members"],
    queryFn: async () => {
      // TODO: Add a filter for better data fetching
      // Get all humans first
      const allHumans = await dbCommands.listHumans({ search: [0, ""] });
      // Then filter by organization_id
      return allHumans.filter(human => human.organization_id === organization.id);
    },
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

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <main className="flex h-full overflow-hidden bg-white">
          <div className="h-full w-full flex flex-col lg:flex-row">
            <div className="lg:w-80 px-4 lg:px-6 py-6 lg:border-r lg:overflow-auto">
              <div className="mb-6 flex flex-col sm:flex-row lg:flex-col items-center text-center sm:text-left lg:text-center sm:justify-between">
                <div className="flex flex-col sm:flex-row lg:flex-col items-center">
                  <div className="relative mb-4 sm:mb-0 lg:mb-4 sm:mr-4 lg:mr-0">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-xl font-medium bg-blue-100 text-blue-600">
                        {getInitials(organization.name || "")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">
                      {organization.name || <Trans>Unnamed Organization</Trans>}
                    </h1>
                    {members.length > 0 && (
                      <p className="text-md text-muted-foreground">
                        <Trans>{members.length} members</Trans>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-4">
                  {getOrganizationWebsite() && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={getOrganizationWebsite()!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Website</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {organization.description && (
                <div className="mt-4 text-sm text-muted-foreground">
                  <h2 className="text-sm font-medium text-neutral-500 mb-2">About</h2>
                  <p>{organization.description}</p>
                </div>
              )}

              {members.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-medium text-neutral-500 mb-2 flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <Trans>Members</Trans>
                  </h2>
                  <div className="space-y-2 mt-2">
                    {members.slice(0, 5).map((member) => (
                      <Link
                        key={member.id}
                        to="/app/human/$id"
                        params={{ id: member.id }}
                        className="flex items-center p-2 rounded-md hover:bg-muted"
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
                      </Link>
                    ))}
                    {members.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        <Trans>and {members.length - 5} more members</Trans>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 px-4 lg:px-6 py-6 overflow-auto">
              <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                    <Calendar className="h-5 w-5" />
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
                                    {format(new Date(event.start_date), "PPP")} •{" "}
                                    {format(new Date(event.start_date), "p")} - {format(new Date(event.end_date), "p")}
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

                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                    <FileText className="h-5 w-5" />
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
            </div>
          </div>
        </main>
      </div>
      <RightPanel />
    </div>
  );
}
