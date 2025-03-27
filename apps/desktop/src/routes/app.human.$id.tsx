import { Trans } from "@lingui/react/macro";
import { RiLinkedinFill } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { Building, Calendar, ExternalLink, FileText, Globe, Mail } from "lucide-react";

import RightPanel from "@/components/right-panel";
import { commands as dbCommands, type Human, type Session } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
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

  const getOrganizationWebsite = () => {
    return organization ? extractWebsiteUrl(human.email) : null;
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <main className="bg-white">
          <div className="max-w-lg mx-auto px-4 lg:px-6 pt-6 pb-20">
            <div className="mb-6 flex flex-col items-center gap-8">
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-xl font-medium">
                    {getInitials(human.full_name || "")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col items-start gap-1">
                  <h1 className="text-lg font-semibold">
                    {human.full_name || <Trans>Unnamed Contact</Trans>}
                  </h1>
                  {human.job_title && <div className="text-sm font-medium text-neutral-500">{human.job_title}</div>}
                  {organization && (
                    <button
                      className="text-sm font-medium text-neutral-500 flex items-center gap-1 hover:scale-95 transition-all hover:text-neutral-700"
                      onClick={() => windowsCommands.windowShow({ organization: organization.id })}
                    >
                      <Building size={14} />
                      {organization.name}
                    </button>
                  )}
                </div>
              </div>

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
