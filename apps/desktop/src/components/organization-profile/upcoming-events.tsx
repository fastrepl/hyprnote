import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, ExternalLink } from "lucide-react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Card, CardContent } from "@hypr/ui/components/ui/card";

import type { UpcomingEventsProps } from "./types";

export function UpcomingEvents({
  organizationId,
  members,
}: UpcomingEventsProps) {
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["events", "upcoming", "organization", organizationId],
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
        new Map(allEvents.map((event) => [event.id, event])).values(),
      );

      return uniqueEvents.slice(0, 10);
    },
    enabled: members.length > 0,
  });

  return (
    <div className="mt-8">
      <h2 className="mb-4 flex items-center justify-center gap-2 font-semibold">
        <Calendar className="size-5" />
        <Trans>Upcoming Events</Trans>
      </h2>
      {upcomingEvents.length > 0
        ? (
          <div className="space-y-4 max-w-xs mx-auto">
            {upcomingEvents.map((event) => (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{event.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_date), "PPP")} • {format(new Date(event.start_date), "p")} -{" "}
                        {format(new Date(event.end_date), "p")}
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
          <p className="text-muted-foreground text-center">
            <Trans>No upcoming events for this organization</Trans>
          </p>
        )}
    </div>
  );
}
