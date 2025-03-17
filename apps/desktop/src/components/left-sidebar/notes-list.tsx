import { useQuery } from "@tanstack/react-query";
import { isFuture } from "date-fns";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

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
        .slice(0, 3);

      return upcomingEvents;
    },
  });

  if (!events.data || events.data.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="font-bold text-neutral-600 mb-1">
        Upcoming
      </h2>

      <div>
        {events.data.map((event) => <EventItem key={event.id} event={event} />)}
      </div>
    </section>
  );
}

export function NotesList() {
  const insertSession = useSessions((s) => s.insert);

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const sessions = await dbCommands.listSessions(null);
      sessions.forEach(insertSession);

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
    },
  });

  const sessionsStore = useSessions((s) => s.sessions);

  return (
    <>
      {sessions.data?.map(
        ([key, items]: [string, Session[]]) => {
          return (
            <section key={key}>
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
                        sessionId={session.id}
                      />
                    </motion.div>
                  ))}
              </motion.div>
            </section>
          );
        },
      )}
    </>
  );
}

export function AllList() {
  return (
    <nav className="h-full overflow-y-auto space-y-4 px-3 pb-4">
      <hr />
      <EventsList />
      <hr />
      <LayoutGroup>
        <AnimatePresence initial={false}>
          <NotesList />
        </AnimatePresence>
      </LayoutGroup>
    </nav>
  );
}
