import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { addDays } from "date-fns";

import { useHypr, useOngoingSession } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";
import EventItem from "./event-item";

export default function EventsList() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);

  const { userId } = useHypr();
  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const events = await dbCommands.listEvents({
        type: "dateRange",
        user_id: userId,
        limit: 3,
        start: new Date().toISOString(),
        end: addDays(new Date(), 30).toISOString(),
      });

      const sessions = await Promise.all(events.map((event) => dbCommands.getSession({ calendarEventId: event.id })));
      return events.map((event, index) => ({ ...event, session: sessions[index] }));
    },
  });

  if (!events.data || events.data.length === 0) {
    return null;
  }

  const activeSessionId = noteMatch?.params.id;

  return (
    <section className="border-b mb-4 border-border">
      <h2 className="font-bold text-neutral-600 mb-1">
        <Trans>Upcoming</Trans>
      </h2>

      <div>
        {events.data
          .filter((event) => !(event.session?.id && ongoingSessionId && event.session.id === ongoingSessionId))
          .map((event) => <EventItem key={event.id} event={event} activeSessionId={activeSessionId} />)}
      </div>
    </section>
  );
}
