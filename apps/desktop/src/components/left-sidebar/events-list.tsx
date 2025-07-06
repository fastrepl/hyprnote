import { Trans } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinkProps, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { format } from "date-fns";
import { AppWindowMacIcon, ArrowUpRight, CalendarDaysIcon, RefreshCwIcon } from "lucide-react";

import { useEnhancePendingState } from "@/hooks/enhance-pending";
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
import { cn } from "@hypr/ui/lib/utils";
import { useSession } from "@hypr/utils/contexts";
import { formatUpcomingTime } from "@hypr/utils/datetime";

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
}: {
  event: EventWithSession;
  activeSessionId?: string;
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
    windowsCommands.windowShow({ type: "calendar" }).then(() => {
      windowsCommands.windowEmitNavigate({ type: "calendar" }, url);
    });
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
            "w-full text-left group flex items-start gap-3 py-2 rounded-lg px-2",
            isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
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
