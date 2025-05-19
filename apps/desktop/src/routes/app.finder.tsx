import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { endOfMonth, startOfMonth } from "date-fns";
import { z } from "zod";

import { ViewSelector } from "@/components/finder/view-selector";
import { CalendarView, FolderView, TableView } from "@/components/finder/views";
import { commands as dbCommands } from "@hypr/plugin-db";
import { cn } from "@hypr/ui/lib/utils";

const schema = z.object({
  view: z.enum(["folder", "calendar", "table"]).default("calendar"),
  date: z.string().optional(),
  sessionId: z.string().optional(),
});

export const Route = createFileRoute("/app/finder")({
  component: FinderView,
  validateSearch: zodValidator(schema),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context: { queryClient, userId }, deps: { search } }) => {
    const currentDate = search.date ? new Date(search.date) : new Date();

    const baseData = {
      view: search.view,
      date: currentDate,
    };

    if (search.view === "calendar") {
      const eventPromise = search.sessionId
        ? queryClient.fetchQuery({
          queryKey: ["event-session", search.sessionId],
          queryFn: () => dbCommands.sessionGetEvent(search.sessionId!),
        })
        : Promise.resolve(null);

      const event = await eventPromise;

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
        queryKey: ["calendar-events", start, end],
        queryFn: () =>
          dbCommands.listEvents({
            type: "dateRange",
            user_id: userId,
            start,
            end,
            limit: 100,
          }),
      });

      const [sessions, events] = await Promise.all([
        sessionsPromise,
        eventsPromise,
      ]);

      return {
        ...baseData,
        date,
        sessions,
        events,
      };
    }

    if (search.view === "table") {
      const currentDate = search.date ? new Date(search.date) : new Date();
      const [start, end] = [startOfMonth(currentDate), endOfMonth(currentDate)].map((v) => v.toISOString());

      const sessionsPromise = queryClient.fetchQuery({
        queryKey: ["sessions-table", start, end],
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
        queryKey: ["events-table", start, end],
        queryFn: () =>
          dbCommands.listEvents({
            type: "dateRange",
            user_id: userId,
            start,
            end,
            limit: 100,
          }),
      });

      const [sessions, events] = await Promise.all([
        sessionsPromise,
        eventsPromise,
      ]);

      return {
        ...baseData,
        sessions,
        events,
      };
    }

    if (search.view === "folder") {
      return baseData;
    }
    return baseData;
  },
});

export type ViewType = "folder" | "calendar" | "table";

interface LoaderData {
  view: ViewType;
  date: Date;
  sessions?: any[];
  events?: any[];
}

function FinderView() {
  const { view, date, sessions, events } = Route.useLoaderData() as LoaderData;
  const navigate = Route.useNavigate();

  const handleViewChange = (newView: ViewType) => {
    navigate({
      search: (prev) => ({
        ...prev,
        view: newView,
      }),
      replace: true,
    });
  };

  const handleNavigate = (params: { date: string }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...params,
      }),
      replace: true,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-neutral-200 px-4 py-1 flex items-center justify-center" data-tauri-drag-region>
        <ViewSelector currentView={view} onViewChange={handleViewChange} />
      </div>

      <div className={cn("flex-1 overflow-hidden", view !== "calendar" && "p-4")}>
        {view === "folder" && (
          <FolderView
            date={date}
            onNavigate={handleNavigate}
          />
        )}
        {view === "calendar" && sessions && events && (
          <CalendarView
            date={date}
            sessions={sessions}
            events={events}
            onNavigate={handleNavigate}
          />
        )}
        {view === "table" && sessions && events && (
          <TableView
            date={date}
            sessions={sessions}
            events={events}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </div>
  );
}
