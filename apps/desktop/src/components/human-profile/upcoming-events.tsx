import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, ExternalLink } from "lucide-react";

import { commands as dbCommands, Human } from "@hypr/plugin-db";
import { Card, CardContent } from "@hypr/ui/components/ui/card";

export function UpcomingEvents({ human }: { human: Human }) {
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
