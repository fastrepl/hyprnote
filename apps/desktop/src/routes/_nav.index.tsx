import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

// import { UpcomingEvents } from "../components/home/UpcomingEvents";
// import { PastNotes } from "../components/home/PastNotes";

const queryOptions = () => ({
  queryKey: ["notes"],
  queryFn: () => {
    return {
      notes: [],
      events: [],
    };
  },
});

export const Route = createFileRoute("/_nav/")({
  component: Component,
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(queryOptions());
  },
  beforeLoad: ({ context }) => {
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

function Component() {
  const {
    data: { notes: _notes, events: _events },
  } = useSuspenseQuery(queryOptions());

  return (
    <main className="mx-auto flex max-w-4xl flex-col space-y-8 p-6"></main>
  );
}
