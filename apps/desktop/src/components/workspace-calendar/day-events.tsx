import { commands as dbCommands, type Event } from "@hypr/plugin-db";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

interface DayEventsProps {
  date: Date;
  events: Event[];
}

export function DayEvents({ date, events }: DayEventsProps) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-1 px-1">
      {events.map((event) => <EventCard key={event.id} event={event} />)}
    </div>
  );
}

export function EventCard({ event }: { event: Event }) {
  const navigate = useNavigate();

  const session = useQuery({
    queryKey: ["event-session", event.id],
    queryFn: async () => dbCommands.getSession({ calendarEventId: event.id }),
  });

  const handleClick = () => {
    if (!session.data) {
      navigate({
        to: "/app",
        search: { eventId: event.id.toString() },
      });
    } else {
      navigate({
        to: "/app/note/$id",
        params: { id: session.data!.id },
      });
    }
  };

  // Check if event has special styling (like birthday with star)
  const isSpecialEvent = event.name.toLowerCase().includes("생일")
    || event.name.toLowerCase().includes("birthday");

  return (
    <div
      onClick={handleClick}
      className="flex items-start space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-100 transition-colors"
    >
      <div className="w-1 h-3 mt-0.5 rounded-full flex-shrink-0 bg-neutral-600"></div>

      <div className="flex-1 text-xs text-neutral-800 truncate">
        {isSpecialEvent && <span className="mr-1">★</span>}
        {event.name}
      </div>
    </div>
  );
}
