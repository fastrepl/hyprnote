import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { addDays } from "date-fns";
import { AnimatePresence, LayoutGroup } from "motion/react";

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
    queryKey: ["events", ongoingSessionId, activeSessionId],
    queryFn: async () => {
      const now = new Date();

      const rawEvents = await dbCommands.listEvents({
        type: "dateRange",
        user_id: userId,
        limit: 20,
        start: now.toISOString(),
        end: addDays(now, 60).toISOString(),
      });

      const upcomingEvents = rawEvents
        .filter((event) => new Date(event.start_date) > now)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      let eventsToShow = upcomingEvents.slice(0, 3);

      const allSessions = await Promise.all(
        upcomingEvents.map((event) => dbCommands.getSession({ calendarEventId: event.id })),
      );
      if (activeSessionId) {
        const activeEventIndex = allSessions.findIndex(
          (session) => session?.id === activeSessionId,
        );

        if (activeEventIndex !== -1) {
          const activeSessionEvent = upcomingEvents[activeEventIndex];
          if (!eventsToShow.find(e => e.id === activeSessionEvent.id)) {
            eventsToShow.push(activeSessionEvent);
          }
        }
      }

      if (eventsToShow.length === 0) {
        return [];
      }

      const sessions = await Promise.all(
        eventsToShow.map((event) => {
          const existingIndex = upcomingEvents.findIndex(e => e.id === event.id);
          return existingIndex !== -1 && existingIndex < allSessions.length
            ? Promise.resolve(allSessions[existingIndex])
            : dbCommands.getSession({ calendarEventId: event.id });
        }),
      );
      sessions
        .filter((s) => s !== null)
        .forEach((s) => insertSession(s!));

      return eventsToShow.map((event, index) => ({
        ...event,
        session: sessions[index],
      }));
    },
  });

  if (windowLabel !== "main") {
    return null;
  }

  if (!isExpanded) {
    return null;
  }

  return (
    <nav className="h-full flex flex-col overflow-hidden border-r bg-neutral-50 w-60">
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
                      (event) => {
                        const eventDate = new Date(event.start_date);
                        const now = new Date();
                        const isFutureEvent = eventDate > now;
                        const isNotOngoingOrIsActive = !(
                          event.session?.id
                          && ongoingSessionId
                          && event.session.id === ongoingSessionId
                          && event.session.id !== activeSessionId
                        );

                        return isFutureEvent && isNotOngoingOrIsActive;
                      },
                    )}
                    activeSessionId={activeSessionId}
                  />
                  <NotesList
                    filter={(session) => {
                      const hasFutureEvent = events.data?.some((event) => {
                        if (event.session?.id !== session.id) {
                          return false;
                        }
                        const eventDate = new Date(event.start_date);
                        const now = new Date();
                        return eventDate > now;
                      }) ?? false;

                      return !hasFutureEvent;
                    }}
                    ongoingSessionId={ongoingSessionId}
                  />
                </div>
              </div>
            </AnimatePresence>
          </LayoutGroup>
        )}
    </nav>
  );
}
