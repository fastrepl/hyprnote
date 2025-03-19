import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { endOfMonth, isFuture, startOfMonth, subMonths } from "date-fns";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

import { useHypr, useSessions } from "@/contexts";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { formatRelative } from "@hypr/utils/datetime";

import { EventItem } from "./event-item";
import { NoteItem } from "./note-item";

export function EventsList() {
  const { userId } = useHypr();

  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const events = await dbCommands.listEvents({ userId });
      const upcomingEvents = events
        .filter((event) => {
          return isFuture(new Date(event.start_date));
        })
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 3);

      return upcomingEvents;
    },
  });

  if (!events.data || events.data.length === 0) {
    return null;
  }

  return (
    <section className="border-b mb-4 border-border">
      <h2 className="font-bold text-neutral-600 mb-1">
        Upcoming
      </h2>

      <div>
        {events.data.map((event) => <EventItem key={event.id} event={event} />)}
      </div>
    </section>
  );
}

const groupSessions = (sessions: Session[]): [string, Session[]][] => {
  const grouped = sessions.reduce<Record<string, Session[]>>((acc, session) => {
    const key = formatRelative(session.created_at);
    return {
      ...acc,
      [key]: [...(acc[key] ?? []), session],
    };
  }, {});

  const groupedAndSorted = Object.entries(grouped).map(([key, sessions]) => {
    const sorted = sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return [key, sorted] as [string, Session[]];
  });

  return groupedAndSorted.sort(([_, sessionsA], [__, sessionsB]) => {
    if (sessionsA.length === 0 || sessionsB.length === 0) return 0;

    const newestA = new Date(sessionsA[0].created_at).getTime();
    const newestB = new Date(sessionsB[0].created_at).getTime();
    return newestB - newestA;
  });
};

export function NotesList() {
  const insertSession = useSessions((s) => s.insert);
  const sessionsStore = useSessions((s) => s.sessions);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useRef<HTMLElement | null>(null);

  const sessions = useInfiniteQuery({
    // TODO: consider new cache key.
    queryKey: ["sessions"],
    queryFn: async ({ pageParam: { monthOffset } }) => {
      const now = new Date();
      const [from, to] = [startOfMonth(now), endOfMonth(now)]
        .map((d) => subMonths(d, monthOffset))
        .map((d) => d.toISOString());

      const sessions = await dbCommands.listSessions({ dateRange: [from, to] });
      sessions.forEach(insertSession);

      return {
        sessions: groupSessions(sessions),
      };
    },
    initialPageParam: { monthOffset: 0 },
    getNextPageParam: (_lastPage, _, { monthOffset }) => {
      return monthOffset > 12 * 10 ? undefined : { monthOffset: monthOffset + 1 };
    },
  });

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && sessions.hasNextPage) {
        sessions.fetchNextPage();
      }
    }, {
      threshold: 0.1,
      rootMargin: "50px",
    });

    if (lastItemRef.current) {
      observer.observe(lastItemRef.current);
    }

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [
    sessions.hasNextPage,
    sessions.fetchNextPage,
    sessions.data,
  ]);

  const setLastItemRef = useCallback((node: HTMLElement | null) => {
    lastItemRef.current = node;

    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const navigate = useNavigate();

  if (!noteMatch) {
    return (
      <div className="border rounded-md p-2">
        <p>Warning: trying to render NotesList outside of `/app/note/$id`</p>
        <button
          className="bg-blue-500 text-white p-2 rounded-md"
          onClick={() => {
            navigate({ to: "/app/new" });
          }}
        >
          Create new note
        </button>
      </div>
    );
  }

  const { params: { id: activeSessionId } } = noteMatch;

  return (
    <>
      {sessions.data?.pages.map((page, pageIndex) =>
        page.sessions.map(([key, items]: [string, Session[]]) => (
          <section key={`${key}-${pageIndex}`}>
            <h2 className="font-bold text-neutral-600 mb-1">
              {key}
            </h2>

            <motion.div layout>
              {items
                .filter((session) => sessionsStore[session.id])
                .map((session: Session) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NoteItem
                      activeSessionId={activeSessionId}
                      currentSessionId={session.id}
                    />
                  </motion.div>
                ))}
            </motion.div>
          </section>
        ))
      )}

      <div
        ref={sessions.hasNextPage ? setLastItemRef : undefined}
        aria-hidden="true"
        className="h-2 w-full"
      />
    </>
  );
}

export function AllList() {
  return (
    <div className="h-full overflow-y-auto space-y-4 px-3 pb-4">
      <EventsList />

      <LayoutGroup>
        <AnimatePresence initial={false}>
          <NotesList />
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
