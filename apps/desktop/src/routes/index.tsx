import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { UpcomingEvents } from "../components/home/UpcomingEvents";
import { PastNotes } from "../components/home/PastNotes";

const queryOptions = () => ({
  queryKey: ["notes"],
  queryFn: () => {
    return {
      notes: [],
      events: [],
    };
  },
});

export const Route = createFileRoute("/")({
  component: Component,
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(queryOptions());
  },
  // beforeLoad: ({ context }) => {
  //   if (!context.auth?.isAuthenticated) {
  //     throw redirect({ to: "/login" });
  //   }
  // },
});

function Component() {
  const navigate = useNavigate();
  const {
    data: { notes: _notes, events: _events },
  } = useSuspenseQuery(queryOptions());

  const handleNoteClick = (id: string) => {
    navigate({
      to: "/note/$id",
      params: { id },
    });
  };

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <UpcomingEvents futureNotes={[]} handleClickNote={handleNoteClick} />
      <PastNotes notes={[]} handleClickNote={handleNoteClick} />
    </main>
  );
}
