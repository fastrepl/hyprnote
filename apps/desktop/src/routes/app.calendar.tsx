import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { clsx } from "clsx";
import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { z } from "zod";

import WorkspaceCalendar from "@/components/workspace-calendar";
import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";

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
      queryFn: () => dbCommands.listSessions({ dateRange: [start, end] }),
    });

    const eventsPromise = queryClient.fetchQuery({
      queryKey: ["events", start, end],
      queryFn: () =>
        dbCommands.listEvents({
          dateRange: {
            userId,
            range: [start, end],
          },
        }),
    });

    const [sessions, events] = await Promise.all([sessionsPromise, eventsPromise]);
    return { sessions, events, date };
  },
});

function Component() {
  const { sessions, events, date } = Route.useLoaderData();
  const navigate = useNavigate();
  const { i18n } = useLingui();

  const today = new Date();

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const handlePreviousMonth = () => {
    navigate({
      to: "/app/calendar",
      search: { date: subMonths(date, 1).toISOString() },
      replace: true,
    });
  };

  const handleNextMonth = () => {
    navigate({
      to: "/app/calendar",
      search: { date: addMonths(date, 1).toISOString() },
      replace: true,
    });
  };

  const handleToday = () => {
    navigate({
      to: "/app/calendar",
      search: { date: today.toISOString() },
      replace: true,
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col bg-white text-neutral-700">
      <header className="flex w-full flex-col">
        <div data-tauri-drag-region className="relative h-11 w-full flex items-center justify-center">
          <h1 className="text-xl font-bold" data-tauri-drag-region>
            {i18n.date(date, { month: "long", year: "numeric" })}
          </h1>

          <div className="absolute right-2 flex h-fit rounded-md overflow-clip border border-neutral-200">
            <Button
              variant="outline"
              className="p-0.5 rounded-none border-none"
              onClick={handlePreviousMonth}
            >
              <ChevronLeftIcon size={16} />
            </Button>

            <Button
              variant="outline"
              className="text-sm px-1 py-0.5 rounded-none border-none"
              onClick={handleToday}
            >
              <Trans>Today</Trans>
            </Button>

            <Button
              variant="outline"
              className="p-0.5 rounded-none border-none"
              onClick={handleNextMonth}
            >
              <ChevronRightIcon size={16} />
            </Button>
          </div>
        </div>

        <div className="border-b border-neutral-200 grid grid-cols-7 h-8">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={clsx(
                "text-center font-light text-sm pb-2 pt-1",
                index === weekDays.length - 1 && "border-r-0",
              )}
            >
              {day}
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 h-full">
        <WorkspaceCalendar month={date} sessions={sessions} events={events} />
      </div>
    </div>
  );
}
