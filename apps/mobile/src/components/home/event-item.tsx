import { useQuery } from "@tanstack/react-query";
import { formatRemainingTime } from "../../utils/date";

import { commands as dbCommands, type Event } from "@hypr/plugin-db";

export function EventItem({ event, onSelect }: { event: Event; onSelect: (sessionId: string) => void }) {
  const session = useQuery({
    queryKey: ["event-session", event.id],
    queryFn: async () => dbCommands.getSession({ calendarEventId: event.id }),
  });

  const handleClick = () => {
    if (session.data) {
      onSelect(session.data.id);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group bg-white flex items-start gap-3 py-3 hover:bg-neutral-100 rounded-lg px-3 border border-neutral-200"
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1 truncate">{event.name}</div>
        <div className="text-xs text-neutral-500">
          {formatRemainingTime(new Date(event.start_date))}
        </div>
      </div>
    </button>
  );
}
