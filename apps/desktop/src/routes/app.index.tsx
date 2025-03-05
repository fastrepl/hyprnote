import { createFileRoute, redirect } from "@tanstack/react-router";

import PastSessions from "@/components/past-sessions";
import UpcomingEvents from "@/components/upcoming-events";

export const Route = createFileRoute("/app/")({
  component: Component,
  beforeLoad: async () => {
    if (!import.meta.env.PROD) {
      return;
    }

    // TODO
    if (false) {
      throw redirect({ to: "/login" });
    }
  },
});

function Component() {
  return (
    <main className="flex h-full flex-col overflow-hidden bg-white">
      <div className="overflow-y-auto px-8">
        <div className="mx-auto max-w-3xl">
          <UpcomingEvents />
          <PastSessions />
        </div>
      </div>
    </main>
  );
}
