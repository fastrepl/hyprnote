import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import PastSessions from "@/components/past-sessions";
import UpcomingEvents from "@/components/upcoming-events";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";

import { commands } from "@/types/tauri";

const queryOptions = () => ({
  queryKey: ["notes"],
  queryFn: async () => {
    const [sessions, events] = await Promise.all([
      commands.dbListSessions(),
      commands.dbListEvents(),
    ]);

    return {
      sessions,
      events,
    };
  },
});

export const Route = createFileRoute("/_nav/")({
  component: Component,
  beforeLoad: ({ context }) => {
    if (!import.meta.env.PROD) {
      return;
    }
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

function Component() {
  const {
    data: { sessions, events },
  } = useSuspenseQuery(queryOptions());

  return (
    <main className="h-full w-full">
      <ScrollArea className="flex h-full w-full flex-col px-12 py-6">
        <UpcomingEvents events={events} handleClickEvent={() => {}} />
        <PastSessions sessions={sessions} handleClickSession={() => {}} />
      </ScrollArea>
    </main>
  );
}
