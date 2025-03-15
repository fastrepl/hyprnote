import { useQuery } from "@tanstack/react-query";
import { isFuture } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { useHypr, useSessions } from "@/contexts";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { format, formatRelative } from "@hypr/utils/datetime";

import { EventItem } from "./event-item";
import { NoteItem } from "./note-item";

export function EventsList() {
  const { userId } = useHypr();

  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const events = await dbCommands.listEvents({ userId });
      const upcomingEvents = events.filter((event) => {
        return isFuture(new Date(event.start_date));
      });

      return upcomingEvents;
    },
  });

  return (
    <>
      {events.data && events.data.length > 0 && (
        <section>
          <h2 className="font-medium text-neutral-600 mb-2 flex items-center gap-2">
            <CalendarIcon className="size-4" />
            <strong>Upcoming</strong>
          </h2>

          <div>
            {events.data.map((event) => <EventItem key={event.id} event={event} />)}
          </div>
        </section>
      )}
    </>
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
        const key = format(session.created_at, "yyyy-MM-dd");
        return {
          ...acc,
          [key]: [...(acc[key] ?? []), session],
        };
      }, {});

      return grouped;
    },
  });

  const sessionsStore = useSessions((s) => s.sessions);

  return (
    <>
      {Object.entries(sessions.data ?? {}).sort(([keyA, _a], [keyB, _b]) => keyA.localeCompare(keyB)).map(
        ([key, items]) => {
          return (
            <section key={key}>
              <h2 className="font-bold text-neutral-600 mb-2">
                {formatRelative(key)}
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
    <nav className="h-full overflow-y-auto space-y-6 px-3 pb-4">
      <EventsList />

      <LayoutGroup>
        <AnimatePresence initial={false}>
          <NotesList />
        </AnimatePresence>
      </LayoutGroup>
    </nav>
  );
}
