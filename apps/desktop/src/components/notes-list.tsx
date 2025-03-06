import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarIcon, Folder } from "lucide-react";
import {
  commands as dbCommands,
  type Event,
  type Session,
} from "@hypr/plugin-db";
import {
  formatDateHeader,
  groupSessionsByDate,
  getSortedDates,
  formatRemainingTime,
} from "@/lib/date";

export default function NotesList() {
  const events = useQuery({
    queryKey: ["events"],
    queryFn: () => dbCommands.listEvents(),
  });

  return (
    <nav className="h-full overflow-y-auto space-y-6 px-3 py-4">
      {events.data && events.data.length > 0 && (
        <section>
          <h2 className="font-medium text-neutral-600 mb-2 flex items-center gap-2">
            <CalendarIcon className="size-4" />
            <strong>Upcoming</strong>
          </h2>

          <div className="divide-y divide-neutral-200">
            {events.data.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <SessionList />
    </nav>
  );
}

function EventItem({ event }: { event: Event }) {
  const navigate = useNavigate();

  const session = useQuery({
    queryKey: ["event-session", event.id],
    queryFn: async () => dbCommands.getSession({ calendarEventId: event.id }),
  });

  const handleClick = () => {
    if (session.data) {
      navigate({
        to: "/app/note/$id",
        params: { id: session.data.id },
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group flex items-start gap-3 py-2 hover:bg-neutral-100 rounded px-2"
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{event.name}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          <span>{formatRemainingTime(new Date(event.start_date))}</span>
        </div>
      </div>
    </button>
  );
}

function SessionList() {
  const navigate = useNavigate();

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => dbCommands.listSessions(null),
  });

  const handleClickSession = (id: string) => {
    navigate({
      to: "/app/note/$id",
      params: { id },
    });
  };

  const groupedSessions = groupSessionsByDate(sessions.data ?? []);
  const sortedDates = getSortedDates(groupedSessions);

  return (
    <>
      {sortedDates.map((dateKey) => {
        const { date, sessions } = groupedSessions[dateKey];

        return (
          <section key={dateKey}>
            <h2 className="font-bold text-neutral-600 mb-2">
              {formatDateHeader(date)}
            </h2>

            <div className="divide-y divide-neutral-200">
              {sessions.map((session: Session) => {
                const sessionDate = new Date(session.created_at);

                return (
                  <button
                    key={session.id}
                    onClick={() => handleClickSession(session.id)}
                    className="w-full text-left group flex items-start gap-3 py-2 hover:bg-neutral-100 rounded px-2"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="font-medium text-sm">{session.title}</div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>{format(sessionDate, "M/d/yy")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        <Folder className="size-3" />
                        <span>Notes</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
