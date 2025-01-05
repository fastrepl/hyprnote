import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import PastSessions from "@/components/past-sessions";
import UpcomingEvents from "@/components/upcoming-events";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";

import { commands } from "@/types/tauri";

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
    <main className="h-full w-full">
      <ScrollArea className="flex h-full w-full flex-col px-12 py-6">
        <UpcomingEvents events={[]} handleClickEvent={() => {}} />
        <PastSessions
          sessions={[
            {
              id: 1,
              title: "Session 1",
              timestamp: "2024-01-01",
              tags: [],
              audio_local_path: "",
              audio_remote_path: "",
              transcript: null,
              raw_memo_html: "",
              enhanced_memo_html: "",
            },
            {
              id: 1,
              title: "Session 1",
              timestamp: "2024-01-01",
              tags: [],
              audio_local_path: "",
              audio_remote_path: "",
              transcript: null,
              raw_memo_html: "",
              enhanced_memo_html: "",
            },
            {
              id: 1,
              title: "Session 1",
              timestamp: "2024-01-01",
              tags: [],
              audio_local_path: "",
              audio_remote_path: "",
              transcript: null,
              raw_memo_html: "",
              enhanced_memo_html: "",
            },
            {
              id: 1,
              title: "Session 1",
              timestamp: "2024-01-01",
              tags: [],
              audio_local_path: "",
              audio_remote_path: "",
              transcript: null,
              raw_memo_html: "",
              enhanced_memo_html: "",
            },
            {
              id: 1,
              title: "Session 1",
              timestamp: "2024-01-01",
              tags: [],
              audio_local_path: "",
              audio_remote_path: "",
              transcript: null,
              raw_memo_html: "",
              enhanced_memo_html: "",
            },
            {
              id: 1,
              title: "Session 1",
              timestamp: "2024-01-01",
              tags: [],
              audio_local_path: "",
              audio_remote_path: "",
              transcript: null,
              raw_memo_html: "",
              enhanced_memo_html: "",
            },
          ]}
          handleClickSession={() => {}}
        />
      </ScrollArea>
    </main>
  );
}
