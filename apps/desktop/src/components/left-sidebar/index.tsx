import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { addDays, subHours } from "date-fns";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { useHypr, useHyprSearch, useLeftSidebar } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";
import EventsList from "./events-list";
import NotesList from "./notes-list";
import OngoingSession from "./ongoing-session";
import SearchList from "./search-list";
import { TopArea } from "./top-area";

export default function LeftSidebar() {
  const { userId } = useHypr();
  const { isExpanded } = useLeftSidebar();

  const insertSession = useSessions((s) => s.insert);
  const { status, ongoingSessionId } = useOngoingSession((s) => ({
    status: s.status,
    ongoingSessionId: s.sessionId,
  }));

  const { isSearching, matches } = useHyprSearch((s) => ({
    isSearching: !!s.query,
    matches: s.matches,
  }));

  const windowLabel = getCurrentWebviewWindowLabel();
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const activeSessionId = noteMatch?.params.id;
  const isInOngoingNoteMain = activeSessionId === ongoingSessionId;
  const isInOngoingNoteSub = activeSessionId === ongoingSessionId;
  const isInOngoingNote = isInOngoingNoteMain || isInOngoingNoteSub;
  const isMeetingRunning = status === "running_active" || status === "running_paused";
  const inMeetingAndNotInNote = isMeetingRunning
    && ongoingSessionId !== null
    && !isInOngoingNote;

  const events = useQuery({
    refetchInterval: 5000,
    queryKey: ["events", ongoingSessionId],
    queryFn: async () => {
      const now = new Date();
      // Fetch events that started up to 12 hours ago.
      // This is to include events that are currently ongoing but might have started earlier.
      // These are then filtered by end_date to ensure we only show active or upcoming events.
      const rawEvents = await dbCommands.listEvents({
        type: "dateRange",
        user_id: userId,
        limit: 3,
        start: subHours(now, 12).toISOString(),
        end: addDays(now, 28).toISOString(),
      });

      const ongoingOrUpcomingEvents = rawEvents.filter(
        (event) => event.end_date > now.toISOString(),
      );

      if (ongoingOrUpcomingEvents.length === 0) {
        return [];
      }

      const sessions = await Promise.all(
        ongoingOrUpcomingEvents.map((event) => dbCommands.getSession({ calendarEventId: event.id })),
      );
      sessions
        .filter((s) => s !== null)
        .forEach((s) => insertSession(s!));

      return ongoingOrUpcomingEvents.map((event, index) => ({
        ...event,
        session: sessions[index],
      }));
    },
  });

  if (windowLabel !== "main") {
    return null;
  }

  return (
    <motion.nav
      layout
      initial={{ width: isExpanded ? 240 : 0, opacity: isExpanded ? 1 : 0 }}
      animate={{ width: isExpanded ? 240 : 0, opacity: isExpanded ? 1 : 0 }}
      transition={{ duration: 0.1 }}
      className="h-full flex flex-col overflow-hidden border-r bg-neutral-50"
    >
      <TopArea />

      {inMeetingAndNotInNote && <OngoingSession sessionId={ongoingSessionId} />}

      {isSearching
        ? (
          <div className="flex-1 h-full overflow-y-auto scrollbar-none">
            <SearchList matches={matches} />
          </div>
        )
        : (
          <LayoutGroup>
            <AnimatePresence initial={false}>
              <div className="flex-1 h-full overflow-y-auto scrollbar-none">
                <div className="h-full space-y-4 px-3 pb-4">
                  <EventsList
                    events={events.data?.filter(
                      (event) =>
                        !(
                          event.session?.id
                          && ongoingSessionId
                          && event.session.id === ongoingSessionId
                          && event.session.id !== activeSessionId
                        ),
                    )}
                    activeSessionId={activeSessionId}
                  />
                  <NotesList
                    filter={(session) =>
                      events.data?.every(
                        (event) => event.session?.id !== session.id,
                      ) ?? true}
                    ongoingSessionId={ongoingSessionId}
                  />
                </div>
              </div>
            </AnimatePresence>
          </LayoutGroup>
        )}
    </motion.nav>
  );
}
