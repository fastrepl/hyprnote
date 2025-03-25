import { Trans } from "@lingui/react/macro";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";

import { useOngoingSession } from "@/contexts";
import { formatRemainingTime } from "@/utils/i18n-datetime";
import { type Event, type Session } from "@hypr/plugin-db";

type EventWithSession = Event & { session: Session | null };

export default function EventsList({ events }: { events: EventWithSession[] }) {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);

  if (events.length === 0) {
    return null;
  }

  const activeSessionId = noteMatch?.params.id;

  return (
    <section className="border-b mb-4 border-border">
      <h2 className="font-bold text-neutral-600 mb-1">
        <Trans>Upcoming</Trans>
      </h2>

      <div>
        {events
          .filter((event) => !(event.session?.id && ongoingSessionId && event.session.id === ongoingSessionId))
          .map((event) => <EventItem key={event.id} event={event} activeSessionId={activeSessionId} />)}
      </div>
    </section>
  );
}

function EventItem(
  { event, activeSessionId }: { event: EventWithSession; activeSessionId?: string },
) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (event.session) {
      navigate({
        to: "/app/note/$id",
        params: { id: event.session.id },
      });
    } else {
      navigate({ to: "/app/new", search: { calendarEventId: event.id } });
    }
  };

  const isActive = activeSessionId && event.session?.id && (activeSessionId === event.session.id);

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
