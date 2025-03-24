import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { endOfMonth, startOfMonth } from "date-fns";
import { z } from "zod";

import WorkspaceCalendar from "@/components/workspace-calendar";
import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as dbCommands } from "@hypr/plugin-db";

const schema = z.object({
  date: z.string().optional(),
  sessionId: z.string().optional(),
});

export const Route = createFileRoute("/app/calendar")({
  component: Component,
  validateSearch: zodValidator(schema),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context: { queryClient }, deps: { search } }) => {
    // TODO: move to the context
    const userIdPromise = queryClient.fetchQuery({
      queryKey: ["userId"],
      queryFn: () => authCommands.getFromStore("auth-user-id"),
    }) as Promise<string>;

    const eventPromise = search.sessionId
      ? queryClient.fetchQuery({
        queryKey: ["event-session", search.sessionId],
        queryFn: () => dbCommands.sessionGetEvent(search.sessionId!),
      })
      : Promise.resolve(null);

    const [userId, event] = await Promise.all([userIdPromise, eventPromise]);

    const date = event?.start_date
      ? new Date(event.start_date)
      : search.date
      ? new Date(search.date)
      : new Date();

    const [start, end] = [startOfMonth(date), endOfMonth(date)].map((v) => v.toISOString());

    const sessionsPromise = queryClient.fetchQuery({
      queryKey: ["sessions", start, end],
      queryFn: () =>
        dbCommands.listSessions({
          type: "dateRange",
          user_id: userId,
          start,
          end,
          limit: 100,
        }),
    });

    const eventsPromise = queryClient.fetchQuery({
      queryKey: ["events", start, end],
      queryFn: () =>
        dbCommands.listEvents({
          type: "dateRange",
          user_id: userId,
          start,
          end,
          limit: 100,
        }),
    });

    const [sessions, events] = await Promise.all([sessionsPromise, eventsPromise]);
    return { sessions, events, date };
  },
});

function Component() {
  const { sessions, events, date } = Route.useLoaderData();

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col bg-white text-neutral-700">
      <div className="flex-1 h-full">
        <WorkspaceCalendar month={date} sessions={sessions} events={events} />
      </div>
    </div>
  );
}
