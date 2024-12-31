import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { UpcomingEvents } from "../components/home/UpcomingEvents";
import { PastNotes } from "../components/home/PastNotes";
import { Event, Note } from "../types";
import { useEffect } from "react";
import { enhanceNote } from "../utils";

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

  const handleClickEvent = (event: Event) => {
    navigate({
      to: "/note/new",
      search: { eventId: event.id },
    });
  };
  const handleClickNote = (note: Note) => {
    navigate({
      to: "/note/$id",
      params: { id: note.id },
    });
  };

  useEffect(() => {
    (async () => {
      const { elementStream } = await enhanceNote(1);
      for await (const hero of elementStream) {
        console.log(hero);
      }
    })();
  }, []);

  return (
    <main className="mx-auto flex max-w-4xl flex-col space-y-8 p-6">
      <UpcomingEvents events={[]} handleClickEvent={handleClickEvent} />
      <PastNotes notes={[]} handleClickNote={handleClickNote} />
    </main>
  );
}
