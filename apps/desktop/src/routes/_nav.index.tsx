import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import PastSessions from "@/components/past-sessions";
import UpcomingEvents from "@/components/upcoming-events";
import { commands } from "@/types";
import WorkspaceAIButton from "@/components/workspace-ai-button";

function Component() {
  const {
    data: { sessions, events },
  } = useSuspenseQuery(queryOptions());

  return (
    <main className="relative flex h-full flex-col overflow-hidden bg-white">
      <div className="overflow-y-auto px-8">
        <div className="mx-auto max-w-3xl">
          <UpcomingEvents events={events} />
          <PastSessions data={sessions} />
        </div>
      </div>

      <WorkspaceAIButton />
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
  beforeLoad: async () => {
    if (!import.meta.env.PROD) {
      return;
    }

    const isAuthenticated = await commands.isAuthenticated();

    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});
