import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import PastSessions from "@/components/past-sessions";
import UpcomingEvents from "@/components/upcoming-events";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";
import { commands } from "@/types/tauri.gen";

function Component() {
  const {
    data: { sessions, events },
  } = useSuspenseQuery(queryOptions());

  return (
    <main className="flex h-full flex-col overflow-hidden">
      <ScrollArea className="px-8 py-6">
        <UpcomingEvents events={events} />
        <PastSessions data={sessions} />
      </ScrollArea>
    </main>
  );
}

const queryOptions = () => ({
  queryKey: ["notes"],
  queryFn: async () => {
    const [sessions, events] = await Promise.all([
      commands.listSessions(null),
      commands.listEvents(),
    ]);
    return {
      sessions,
      events,
    };
  },
});

export const Route = createFileRoute("/_nav/")({
  component: Component,
  beforeLoad: async ({ context }) => {
    if (!import.meta.env.PROD) {
      return;
    }

    const isAuthenticated = await context.auth?.isAuthenticated();

    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});
