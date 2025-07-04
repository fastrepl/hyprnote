import { Trans } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinkProps, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { format } from "date-fns";
import {
  AppWindowMacIcon,
  ArrowUpRight,
  CalendarDaysIcon,
  EyeIcon,
  EyeOffIcon,
  FoldVerticalIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { useSession } from "@hypr/utils/contexts";
import { formatUpcomingTime } from "@hypr/utils/datetime";
import { safeNavigate } from "@hypr/utils/navigation";

type EventWithSession = Event & { session: Session | null };

const MINIMUM_SYNC_DURATION = 500;

interface EventsListProps {
  events?: EventWithSession[] | null;
  activeSessionId?: string;
}

export default function EventsList({
  events,
  activeSessionId,
}: EventsListProps) {
  const queryClient = useQueryClient();
  const [hiddenEventIds, setHiddenEventIds] = useState<Set<string>>(new Set());
  const [showAllHidden, setShowAllHidden] = useState(false);

  const sortedEvents = useMemo(
    () => events?.sort((a, b) => a.start_date.localeCompare(b.start_date)) || [],
    [events],
  );

  const syncEventsMutation = useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      const result = await appleCalendarCommands.syncEvents();
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime < MINIMUM_SYNC_DURATION) {
        await new Promise(resolve => setTimeout(resolve, MINIMUM_SYNC_DURATION - elapsedTime));
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
    onError: (error) => {
      console.error("Failed to sync events:", error);
      toast.error("Failed to sync events", {
        description: "There was an error syncing your calendar events. Please try again.",
      });
    },
  });

  const hideEvent = (eventId: string) => {
    setHiddenEventIds(prev => new Set([...prev, eventId]));
  };

  const showEvent = (eventId: string) => {
    setHiddenEventIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });
  };

  const toggleShowAllHidden = () => {
    if (showAllHidden) {
      setShowAllHidden(false);
    } else {
      setShowAllHidden(true);
    }
  };

  const hasHiddenEvents = hiddenEventIds.size > 0;

  return (
    <TooltipProvider>
      <section className="border-b mb-4 border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-neutral-600 mb-1">
              <Trans>Upcoming</Trans>
            </h2>
            <button
              disabled={syncEventsMutation.isPending}
              onClick={() => syncEventsMutation.mutate()}
              aria-label="Sync events"
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

          {hasHiddenEvents && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleShowAllHidden}
                  className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
                  aria-label={showAllHidden ? "Fold all hidden events" : "Unfold all hidden events"}
                >
                  {showAllHidden ? <EyeIcon size={12} /> : <EyeOffIcon size={12} />}
                  {showAllHidden ? "Fold All" : "Unfold All"}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showAllHidden ? "Fold all hidden events" : "Unfold all hidden events"}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {sortedEvents.length
          ? (
            <div>
              {sortedEvents.map((event) => {
                const isHidden = hiddenEventIds.has(event.id) && !showAllHidden;

                if (isHidden) {
                  return (
                    <HiddenEventItem
                      key={event.id}
                      event={event}
                      onShow={() => showEvent(event.id)}
                    />
                  );
                }

                return (
                  <EventItem
                    key={event.id}
                    event={event}
                    activeSessionId={activeSessionId}
                    onHide={() => hideEvent(event.id)}
                  />
                );
              })}
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
    </TooltipProvider>
  );
}

function HiddenEventItem({
  event,
  onShow,
}: {
  event: EventWithSession;
  onShow: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onShow}
          className="w-full py-1 group hover:bg-neutral-100 rounded px-2"
        >
          <div className="h-1 bg-neutral-400 rounded-full group-hover:bg-neutral-500 transition-colors" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <div className="text-sm">
          <div className="font-medium">{event.name}</div>
          <div className="text-xs text-neutral-500">
            {formatUpcomingTime(new Date(event.start_date))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function EventItem({
  event,
  activeSessionId,
  onHide,
}: {
  event: EventWithSession;
  activeSessionId?: string;
  onHide?: () => void;
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

        {onHide && (
          <ContextMenuItem
            className="cursor-pointer flex items-center gap-2"
            onClick={onHide}
          >
            <FoldVerticalIcon size={16} />
            <Trans>Hide Event</Trans>
          </ContextMenuItem>
        )}
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
