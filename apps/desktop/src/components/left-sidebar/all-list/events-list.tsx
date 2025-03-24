import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { isFuture } from "date-fns";

import { useHypr } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";
import EventItem from "./event-item";

export default function EventsList() {
  const { userId } = useHypr();

  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const events = await dbCommands.listEvents({
        type: "simple",
        user_id: userId,
        limit: 50,
      });
      const upcomingEvents = events
        .filter((event) => {
          return isFuture(new Date(event.start_date));
        })
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 3);

      return upcomingEvents;
    },
  });

  if (!events.data || events.data.length === 0) {
    return null;
  }

  return (
    <section className="border-b mb-4 border-border">
      <h2 className="font-bold text-neutral-600 mb-1">
        <Trans>Upcoming</Trans>
      </h2>

      <div>
        {events.data.map((event) => <EventItem key={event.id} event={event} />)}
      </div>
    </section>
  );
}
