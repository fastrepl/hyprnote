import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";

import { type Event, type Session } from "@hypr/plugin-db";
import { useSession } from "@hypr/utils/contexts";
import { formatUpcomingTime } from "@hypr/utils/datetime";

type EventWithSession = Event & { session: Session | null };

interface EventsListProps {
  events?: EventWithSession[] | null;
  activeSessionId?: string;
}

export default function EventsList({ events, activeSessionId }: EventsListProps) {
  if (!events || events.length === 0) {
    return null;
  }

  return (
    <section className="border-b mb-4 border-border">
      <h2 className="font-bold text-neutral-600 mb-1">
        <Trans>Upcoming</Trans>
      </h2>

      <div>
        {events
          .sort((a, b) => a.start_date.localeCompare(b.start_date))
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
        <EventItemTitle event={event} />
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          <span>{formatUpcomingTime(new Date(event.start_date))}</span>
        </div>
      </div>
    </button>
  );
}

function EventItemTitle({ event }: { event: EventWithSession }) {
  const sessionId = event.session?.id;

  return sessionId
    ? <EventItemTitleWithSession sessionId={sessionId} />
    : <EventItemTitleWithoutSession event={event} />;
}

function EventItemTitleWithoutSession({ event }: { event: EventWithSession }) {
  return <div className="font-medium text-sm line-clamp-1">{event.name}</div>;
}

function EventItemTitleWithSession({ sessionId }: { sessionId: string }) {
  const title = useSession(sessionId, (s) => s.session.title);
  return <div className="font-medium text-sm line-clamp-1">{title}</div>;
}
