import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";

import { formatRemainingTime } from "@/utils/i18n-datetime";
import { commands as dbCommands, type Event } from "@hypr/plugin-db";

export default function EventItem({ event, activeSessionId }: { event: Event; activeSessionId?: string }) {
  const navigate = useNavigate();

  const session = useQuery({
    queryKey: ["event-session", event.id],
    queryFn: () => dbCommands.getSession({ calendarEventId: event.id }),
  });
  const handleClick = () => {
    if (session.data) {
      navigate({
        to: "/app/note/$id",
        params: { id: session.data.id },
      });
    } else {
      navigate({ to: "/app/new", search: { calendarEventId: event.id } });
    }
  };

  const isActive = activeSessionId && session.data?.id && (activeSessionId === session.data.id);

  return (
    <button
      onClick={handleClick}
      className={clsx([
        "w-full text-left group flex items-start gap-3 py-2 rounded-lg px-2",
        isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
      ])}
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
