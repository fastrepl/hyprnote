import { type Event } from "@hypr/plugin-db";
import { useEffect, useState } from "react";

export function useUpcomingEvents(events: Event[] | null | undefined) {
  const [upcomingEventIds, setUpcomingEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!events?.length) {
      setUpcomingEventIds(new Set());
      return;
    }

    const checkUpcomingEvents = () => {
      const now = new Date();
      const upcoming = new Set<string>();

      for (const event of events) {
        const eventStart = new Date(event.start_date);
        const diffMs = eventStart.getTime() - now.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);

        // Event is upcoming if it starts within the next 60 seconds
        if (diffSeconds > 0 && diffSeconds <= 60) {
          upcoming.add(event.id);
        }
      }

      setUpcomingEventIds(upcoming);
    };

    // Check immediately
    checkUpcomingEvents();

    // Check every 5 seconds
    const interval = setInterval(checkUpcomingEvents, 5000);

    return () => clearInterval(interval);
  }, [events]);

  return upcomingEventIds;
}
