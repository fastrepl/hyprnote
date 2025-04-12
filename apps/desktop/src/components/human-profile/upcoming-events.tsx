import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, ExternalLink } from "lucide-react";

import { commands as dbCommands, Human } from "@hypr/plugin-db";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import { EmptyState, LoadingSkeleton, ProfileSectionHeader } from "./common";

export function UpcomingEvents({ human }: { human: Human }) {
  const { data: upcomingEvents = [], isLoading } = useQuery({
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

  const isEmpty = !isLoading && upcomingEvents.length === 0;

  return (
    <div className="mt-8">
      <ProfileSectionHeader
        title="Upcoming Events"
        actionLabel="Add Event"
        hideAction={isEmpty}
      />

      {isLoading ? <LoadingSkeleton count={2} /> : upcomingEvents.length > 0
        ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200 shadow-sm rounded-lg overflow-hidden"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-zinc-900">{event.name}</h3>
                      <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 inline" />
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
                        className="text-zinc-400 hover:text-zinc-600 transition-colors ml-2"
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
          <EmptyState
            icon={<Calendar className="h-14 w-14" />}
            title={<Trans>No upcoming events with this contact</Trans>}
          />
        )}
    </div>
  );
}
