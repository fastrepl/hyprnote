import { useQuery } from "@tanstack/react-query";
import { isFuture } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { useHypr, useSessions } from "@/contexts";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { format, formatRelative } from "@hypr/utils/datetime";

import { EventItem } from "./event-item";
import { NoteItem } from "./note-item";

export default function NotesList() {
  const { userId } = useHypr();

  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const events = await dbCommands.listEvents(userId);
      const upcomingEvents = events.filter((event) => {
        return isFuture(new Date(event.start_date));
      });

      return upcomingEvents;
    },
  });

  const sessionsInit = useSessions((s) => s.init);

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const sessions = await dbCommands.listSessions(null);
      sessionsInit();

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
    <nav className="h-full overflow-y-auto space-y-6 px-3 pb-4">
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

      {Object.entries(sessions.data ?? {}).sort(([keyA, _a], [keyB, _b]) => keyA.localeCompare(keyB)).map(
        ([key, items]) => {
          return (
            <section key={key}>
              <h2 className="font-bold text-neutral-600 mb-2">
                {formatRelative(key)}
              </h2>

              <div>
                {items
                  // TODO: not ideal. fresh note is not visible
                  .filter((session) => sessionsStore[session.id])
                  .map((session: Session) => (
                    <NoteItem
                      key={session.id}
                      sessionId={session.id}
                    />
                  ))}
              </div>
            </section>
          );
        },
      )}
    </nav>
  );
}
