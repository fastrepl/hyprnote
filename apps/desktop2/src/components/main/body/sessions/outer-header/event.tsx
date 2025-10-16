import { useCallback, useState } from "react";

import { type Event, EventChip } from "@hypr/ui/components/block/event-chip";
import { useQuery } from "../../../../../hooks/useQuery";
import * as persisted from "../../../../../store/tinybase/persisted";

export function SessionEvent({
  sessionId,
}: {
  sessionId: string;
}) {
  const sessionRow = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const [eventSearchQuery, setEventSearchQuery] = useState("");

  const store = persisted.UI.useStore(persisted.STORE_ID);

  const eventRow = persisted.UI.useRow(
    "events",
    sessionRow.event_id || "dummy-event-id",
    persisted.STORE_ID,
  );

  const event: Event | null = sessionRow.event_id && eventRow && eventRow.started_at && eventRow.ended_at
    ? {
      id: sessionRow.event_id,
      name: eventRow.title ?? "",
      start_date: eventRow.started_at,
      end_date: eventRow.ended_at,
      calendar_id: eventRow.calendar_id ?? undefined,
    }
    : null;

  const eventSearch = useQuery({
    enabled: !!store,
    deps: [store, eventSearchQuery] as const,
    queryFn: async (store, query) => {
      const results: Event[] = [];
      const now = new Date();

      store!.forEachRow("events", (rowId, forEachCell) => {
        let title: string | undefined;
        let started_at: string | undefined;
        let ended_at: string | undefined;
        let calendar_id: string | undefined;

        forEachCell((cellId, cell) => {
          if (cellId === "title") {
            title = cell as string;
          } else if (cellId === "started_at") {
            started_at = cell as string;
          } else if (cellId === "ended_at") {
            ended_at = cell as string;
          } else if (cellId === "calendar_id") {
            calendar_id = cell as string;
          }
        });

        if (!started_at || !ended_at) {
          return;
        }

        const eventEndDate = new Date(ended_at);

        if (eventEndDate >= now) {
          return;
        }

        if (
          query && title
          && !title.toLowerCase().includes(query.toLowerCase())
        ) {
          return;
        }

        results.push({
          id: rowId,
          name: title ?? "",
          start_date: started_at,
          end_date: ended_at,
          calendar_id: calendar_id,
        });
      });

      results.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      return results.slice(0, 20);
    },
  });

  const handleEventSelect = useCallback((eventId: string) => {
    if (store) {
      store.setCell("sessions", sessionId, "event_id", eventId);
    }
  }, [store, sessionId]);

  const handleEventDetach = useCallback(() => {
    if (store) {
      store.delCell("sessions", sessionId, "event_id");
    }
  }, [store, sessionId]);

  const handleDateChange = useCallback((date: Date) => {
    if (store) {
      store.setCell("sessions", sessionId, "created_at", date.toISOString());
    }
  }, [store, sessionId]);

  const handleJoinMeeting = useCallback((meetingLink: string) => {
    window.open(meetingLink, "_blank");
  }, []);

  const handleViewInCalendar = useCallback(() => {
  }, []);

  return (
    <EventChip
      event={event}
      date={sessionRow.created_at || new Date().toISOString()}
      isVeryNarrow={false}
      isNarrow={false}
      onEventSelect={handleEventSelect}
      onEventDetach={handleEventDetach}
      onDateChange={handleDateChange}
      onJoinMeeting={handleJoinMeeting}
      onViewInCalendar={handleViewInCalendar}
      searchQuery={eventSearchQuery}
      onSearchChange={setEventSearchQuery}
      searchResults={eventSearch.data ?? []}
    />
  );
}
