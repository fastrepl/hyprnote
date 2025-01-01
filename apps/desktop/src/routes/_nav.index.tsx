import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { UpcomingEvents } from "../components/home/UpcomingEvents";
import { PastNotes } from "../components/home/PastNotes";
import { Event, Note } from "../types";
import { useEnhanceNote } from "../utils/ai";
import { useEffect } from "react";

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

  const { data, isLoading, error, stop, submit } = useEnhanceNote();
  useEffect(() => {
    submit();
  }, []);
  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      console.log(data);
    }
  }, [data]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col space-y-8 p-6">
      <UpcomingEvents events={[]} handleClickEvent={handleClickEvent} />
      <PastNotes notes={[]} handleClickNote={handleClickNote} />
    </main>
  );
}
