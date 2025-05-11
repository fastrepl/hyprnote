import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CalendarIcon, SearchIcon, SpeechIcon, VideoIcon } from "lucide-react";
import { useState } from "react";

import { useHypr } from "@/contexts";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { commands as dbCommands, type Event } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/ui/lib/utils";
import { useSession } from "@hypr/utils/contexts";
import { formatRelativeWithDay } from "@hypr/utils/datetime";
import { subDays } from "date-fns";

interface EventChipProps {
  sessionId: string;
}

interface EventWithMeetingLink extends Event {
  meetingLink?: string | null;
}

export function EventChip({ sessionId }: EventChipProps) {
  const { userId, onboardingSessionId } = useHypr();
  const [isEventSelectorOpen, setIsEventSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { sessionCreatedAt } = useSession(sessionId, (s) => ({
    sessionCreatedAt: s.session.created_at,
  }));

  const event = useQuery({
    queryKey: ["event", sessionId],
    queryFn: async (): Promise<EventWithMeetingLink | null> => {
      const eventData = await dbCommands.sessionGetEvent(sessionId);
      if (!eventData) {
        return null;
      }

      const meetingLink = await miscCommands.parseMeetingLink(eventData.note);
      return { ...eventData, meetingLink };
    },
  });

  const calendar = useQuery({
    enabled: !!event.data?.calendar_id,
    queryKey: ["calendar", event.data?.calendar_id],
    queryFn: async () => {
      const id = event.data?.calendar_id!;
      return dbCommands.getCalendar(id);
    },
  });

  const eventsInPastWithoutAssignedSession = useQuery({
    queryKey: ["events-in-past-without-assigned-session", userId, sessionId],
    queryFn: async (): Promise<Event[]> => {
      const events = await dbCommands.listEvents({
        limit: 100,
        user_id: userId,
        type: "dateRange",
        start: subDays(new Date(), 28).toISOString(),
        end: new Date().toISOString(),
      });

      const sessions = await Promise.all(
        events.map((eventItem) => dbCommands.getSession({ calendarEventId: eventItem.id })),
      );

      const ret = events.filter((eventItem) => {
        const isLinkedToAnotherSession = sessions.find((s) =>
          s?.calendar_event_id === eventItem.id && s.id !== sessionId
        );
        return !isLinkedToAnotherSession;
      });
      return ret;
    },
    enabled: isEventSelectorOpen && !event.data,
  });

  const assignEvent = useMutation({
    mutationFn: async (eventId: string) => {
      await dbCommands.setSessionEvent(sessionId, eventId);
    },
    onSuccess: () => {
      event.refetch();
      eventsInPastWithoutAssignedSession.refetch();
    },
  });

  const handleClickCalendar = () => {
    if (calendar.data) {
      if (calendar.data.platform === "Apple") {
        appleCalendarCommands.openCalendar();
      }
    }
  };

  const handleSelectEvent = async (eventIdToLink: string) => {
    assignEvent.mutate(eventIdToLink, {
      onSuccess: () => {
        event.refetch();
        eventsInPastWithoutAssignedSession.refetch();
        setIsEventSelectorOpen(false);
      },
      onError: (error) => {
        console.error("Failed to set session event:", error);
      },
    });
  };

  const date = event.data?.start_date ?? sessionCreatedAt;

  if (onboardingSessionId === sessionId) {
    return (
      <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5">
        <CalendarIcon size={14} />
        <p className="text-xs">{formatRelativeWithDay(date)}</p>
      </div>
    );
  }

  if (event.data) {
    return (
      <Popover>
        <PopoverTrigger>
          <div
            className={cn(
              "flex flex-row items-center gap-2 rounded-md px-2 py-1.5",
              "hover:bg-neutral-100",
            )}
          >
            {event.data.meetingLink ? <VideoIcon size={14} /> : <SpeechIcon size={14} />}
            <p className="text-xs">{formatRelativeWithDay(date)}</p>
          </div>
        </PopoverTrigger>

        <PopoverContent align="start" className="shadow-lg w-80">
          <div className="flex flex-col gap-2">
            <div className="font-semibold">{event.data.name}</div>
            {event.data.note && (
              <div className="text-sm text-neutral-600 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                {event.data.note}
              </div>
            )}
            {event.data.meetingLink && (
              <Button
                variant="outline"
                className="flex items-center gap-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap"
                onClick={() => {
                  const meetingLink = event.data?.meetingLink;
                  if (typeof meetingLink === "string") {
                    openUrl(meetingLink);
                  }
                }}
              >
                <VideoIcon size={14} />
                <span className="truncate">
                  <Trans>Join meeting</Trans>
                </span>
              </Button>
            )}
            <Button variant="outline" onClick={handleClickCalendar} disabled={!calendar.data}>
              <Trans>View in calendar</Trans>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  } else {
    return (
      <Popover open={isEventSelectorOpen} onOpenChange={setIsEventSelectorOpen}>
        <PopoverTrigger asChild>
          <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 cursor-pointer">
            <CalendarIcon size={14} />
            <p className="text-xs">{formatRelativeWithDay(sessionCreatedAt)}</p>
          </div>
        </PopoverTrigger>

        <PopoverContent align="start" className="shadow-lg w-80">
          <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded-md bg-neutral-50 border border-neutral-200 transition-colors mb-2">
            <span className="text-neutral-500 flex-shrink-0">
              <SearchIcon className="size-4" />
            </span>
            <input
              type="text"
              placeholder="Search past events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
            />
          </div>

          {(() => {
            if (eventsInPastWithoutAssignedSession.isLoading) {
              return (
                <div className="p-4 text-center text-sm text-neutral-500">
                  <Trans>Loading events...</Trans>
                </div>
              );
            }

            const filteredEvents = (eventsInPastWithoutAssignedSession.data || []).filter((ev: Event) =>
              ev.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredEvents.length === 0) {
              return (
                <div className="p-4 text-center text-sm text-neutral-500">
                  <Trans>No past events found.</Trans>
                </div>
              );
            }

            return (
              <div className="max-h-60 overflow-y-auto pt-0">
                {filteredEvents.map((linkableEv: Event) => (
                  <button
                    key={linkableEv.id}
                    onClick={() => handleSelectEvent(linkableEv.id)}
                    className="flex flex-col items-start p-2 hover:bg-neutral-100 text-left w-full rounded-md"
                  >
                    <p className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap w-full">
                      {linkableEv.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatRelativeWithDay(linkableEv.start_date)}
                    </p>
                  </button>
                ))}
              </div>
            );
          })()}
        </PopoverContent>
      </Popover>
    );
  }
}
