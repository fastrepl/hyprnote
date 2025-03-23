import { Trans } from "@lingui/react/macro";
import { RiAedFill } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, ExternalLink, FileText, Mail } from "lucide-react";

import RightPanel from "@/components/note/right-panel";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { getInitials } from "@hypr/utils";

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

    let organization = null;
    if (human.organization_id) {
      organization = await queryClient.fetchQuery({
        queryKey: ["organization", human.organization_id],
        queryFn: () => dbCommands.getOrganization(human.organization_id!),
      });
    }

    return { human, organization };
  },
});

function Component() {
  const { human, organization } = Route.useLoaderData();

  const getOrganizationWebsite = () => {
    if (!organization?.description) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = organization.description.match(urlRegex);

    if (!matches) return null;

    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
      "aol.com",
      "protonmail.com",
      "mail.com",
      "zoho.com",
      "yandex.com",
      "gmx.com",
      "tutanota.com",
    ];

    const validUrls = matches.filter(url => {
      return !personalDomains.some(domain => url.includes(domain));
    });

    return validUrls.length > 0 ? validUrls[0] : null;
  };

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
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <main className="flex h-full overflow-hidden bg-white">
          <div className="h-full w-full flex flex-col lg:flex-row">
            <div className="lg:w-80 px-4 lg:px-6 py-6 lg:border-r lg:overflow-auto">
              <div className="mb-6 flex flex-col sm:flex-row lg:flex-col items-center text-center sm:text-left lg:text-center sm:justify-between">
                <div className="flex flex-col sm:flex-row lg:flex-col items-center">
                  <div className="relative mb-4 sm:mb-0 lg:mb-4 sm:mr-4 lg:mr-0">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-xl font-medium">
                        {getInitials(human.full_name || "")}
                      </AvatarFallback>
                    </Avatar>
                    {!human.is_user && (
                      <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <RiAedFill size={24} className="text-amber-500" />
                            </TooltipTrigger>

                            <TooltipContent side="bottom">
                              <p className="text-sm">Uses Hyprnote</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">
                      {human.full_name || <Trans>Unnamed Contact</Trans>}
                    </h1>
                    {human.job_title && <p className="text-md text-muted-foreground">{human.job_title}</p>}
                  </div>
                </div>

                {organization && (
                  <div className="mt-4 sm:mt-0 lg:mt-4 sm:text-right lg:text-center">
                    <h2 className="text-sm font-medium text-neutral-500">Organization</h2>
                    <p className="text-md font-medium">{organization.name}</p>
                    {organization.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{organization.description}</p>
                    )}
                    {getOrganizationWebsite() && (
                      <a
                        href={getOrganizationWebsite()!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center justify-center sm:justify-end lg:justify-center mt-1"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Website
                      </a>
                    )}
                  </div>
                )}

                <div className="flex justify-center gap-4 mt-4">
                  {human.email && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`mailto:${human.email}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                          >
                            <Mail className="h-5 w-5" />
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
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-5 w-5 fill-current"
                            >
                              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z">
                              </path>
                            </svg>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">LinkedIn: {human.linkedin_username}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {organization && getOrganizationWebsite() && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={getOrganizationWebsite() || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{organization.name} Website</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {organization && organization.description && (
                <div className="mt-4 text-sm text-center text-muted-foreground">
                  {organization.description}
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
                        <Trans>No upcoming events with this contact</Trans>
                      </p>
                    )}
                </div>

                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                    <FileText className="h-5 w-5" />
                    <Trans>Past Notes</Trans>
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
                        <Trans>No past notes with this contact</Trans>
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
