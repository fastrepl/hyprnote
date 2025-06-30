import { Trans } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinkProps, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { format } from "date-fns";
import { AppWindowMacIcon, ArrowUpRight, CalendarDaysIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { useUpcomingEvents } from "@/hooks/use-upcoming-events";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { type Event, type Session } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { SplashLoader } from "@hypr/ui/components/ui/splash";
import { toast } from "@hypr/ui/components/ui/toast";
import { cn } from "@hypr/ui/lib/utils";
import { useSession } from "@hypr/utils/contexts";
import { formatUpcomingTime } from "@hypr/utils/datetime";
import { safeNavigate } from "@hypr/utils/navigation";

type EventWithSession = Event & { session: Session | null };

interface EventsListProps {
  events?: EventWithSession[] | null;
  activeSessionId?: string;
}

export default function EventsList({
  events,
  activeSessionId,
}: EventsListProps) {
  const queryClient = useQueryClient();
  const upcomingEventIds = useUpcomingEvents(events);
  const notifiedEvents = useRef<Set<string>>(new Set());

  // Show toast notifications for newly upcoming events
  useEffect(() => {
    if (!events?.length || upcomingEventIds.size === 0) {
      return;
    }

    for (const eventId of upcomingEventIds) {
      if (!notifiedEvents.current.has(eventId)) {
        const event = events.find(e => e.id === eventId);
        if (event) {
          toast({
            id: `upcoming-event-${eventId}`,
            title: "Event Starting Soon",
            content: `${event.name} is about to begin`,
            dismissible: true,
            duration: 5000,
          });
          notifiedEvents.current.add(eventId);
        }
      }
    }

    // Clean up notified events that are no longer upcoming
    const currentNotified = Array.from(notifiedEvents.current);
    for (const eventId of currentNotified) {
      if (!upcomingEventIds.has(eventId)) {
        notifiedEvents.current.delete(eventId);
      }
    }
  }, [upcomingEventIds, events]);

  const syncEventsMutation = useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      const result = await appleCalendarCommands.syncEvents();
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime < 500) {
        await new Promise(resolve => setTimeout(resolve, 500 - elapsedTime));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate(query) {
          return query.queryKey?.[0] === "events";
        },
      });
    },
  });

  return (
    <section className="border-b mb-4 border-border">
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-neutral-600 mb-1">
          <Trans>Upcoming</Trans>
        </h2>
        <button
          disabled={syncEventsMutation.isPending}
          onClick={() => syncEventsMutation.mutate()}
        >
          <RefreshCwIcon
            size={12}
            className={cn(
              syncEventsMutation.isPending && "animate-spin",
              "text-gray-500 hover:text-gray-700",
            )}
          />
        </button>
      </div>

      {events?.length
        ? (
          <div>
            {events
              .sort((a, b) => a.start_date.localeCompare(b.start_date))
              .map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  activeSessionId={activeSessionId}
                  isUpcoming={upcomingEventIds.has(event.id)}
                />
              ))}
          </div>
        )
        : (
          <div className="pb-2 pl-1">
            <p className="text-xs text-neutral-400">
              <Trans>No upcoming events</Trans>
            </p>
          </div>
        )}
    </section>
  );
}

function EventItem({
  event,
  activeSessionId,
  isUpcoming,
}: {
  event: EventWithSession;
  activeSessionId?: string;
  isUpcoming: boolean;
}) {
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

  const handleOpenWindow = () => {
    if (event.session) {
      windowsCommands.windowShow({ type: "note", value: event.session.id });
    }
  };

  const handleOpenCalendar = () => {
    const date = new Date(event.start_date);

    const params = {
      to: "/app/calendar",
      search: { date: format(date, "yyyy-MM-dd") },
    } as const satisfies LinkProps;

    const url = `${params.to}?date=${params.search.date}`;
    safeNavigate({ type: "calendar" }, url);
  };

  const isActive = activeSessionId
    && event.session?.id
    && activeSessionId === event.session.id;

  const sessionId = event.session?.id || "";
  const isEnhancePending = useEnhancePendingState(sessionId);
  const shouldShowEnhancePending = !isActive && !!event.session?.id && isEnhancePending;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          onClick={handleClick}
          className={clsx([
            "w-full text-left group flex items-start gap-3 py-2 rounded-lg px-2 transition-all duration-200",
            isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
            isUpcoming && "animate-pulse ring-2 ring-orange-300 ring-opacity-75 bg-orange-50",
          ])}
        >
          <div className="flex items-center gap-1 w-full">
            <div className="flex-1 flex flex-col items-start gap-1 truncate">
              <EventItemTitle event={event} />

              <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
                <span>{formatUpcomingTime(new Date(event.start_date))}</span>
              </div>
            </div>

            {shouldShowEnhancePending && <SplashLoader size={20} strokeWidth={2} />}
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        {event.session && (
          <ContextMenuItem
            className="cursor-pointer flex items-center justify-between"
            onClick={handleOpenWindow}
          >
            <div className="flex items-center gap-2">
              <AppWindowMacIcon size={16} />
              <Trans>New window</Trans>
            </div>
            <ArrowUpRight size={16} className="ml-1 text-zinc-500" />
          </ContextMenuItem>
        )}

        <ContextMenuItem
          className="cursor-pointer flex items-center justify-between"
          onClick={handleOpenCalendar}
        >
          <div className="flex items-center gap-2">
            <CalendarDaysIcon size={16} />
            <Trans>View in calendar</Trans>
          </div>
          <ArrowUpRight size={16} className="ml-1 text-zinc-500" />
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
