import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import UpcomingEvents from "../components/UpcomingEvents";
import { useEffect } from "react";
import { commands } from "../types/tauri";
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
    // if (!import.meta.env.PROD) {
    //   return;
    // }

    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

function Component() {
  const {
    data: { notes: _notes, events: _events },
  } = useSuspenseQuery(queryOptions());

  useEffect(() => {
    const id = "C30E6C6A-80EC-4F5D-93A8-CB1473C338C5";
    // commands.listCalendars().then((calendars) => {
    //   console.log(calendars);
    // });

    commands.listEvents(id).then((events) => {
      console.log(events);
    });
  }, []);

  return (
    <main className="mx-auto flex max-w-4xl flex-col space-y-8 p-6">
      <UpcomingEvents events={[]} handleClickEvent={() => {}} />
    </main>
  );
}
