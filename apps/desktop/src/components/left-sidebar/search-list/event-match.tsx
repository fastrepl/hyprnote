import { useNavigate } from "@tanstack/react-router";

import { type SearchMatch } from "@/stores/search";
import { formatRemainingTime } from "@hypr/utils/datetime";

export function EventMatch({ match }: { match: SearchMatch & { type: "event" } }) {
  const navigate = useNavigate();
  const event = match.item;

  const handleClick = () => {
    navigate({ to: "/app/new", search: { calendarEventId: event.id } });
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group flex items-start py-2 hover:bg-neutral-100 rounded-lg px-2"
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{event.name}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          {formatRemainingTime(new Date(event.start_date))}
        </div>
      </div>
    </button>
  );
}
