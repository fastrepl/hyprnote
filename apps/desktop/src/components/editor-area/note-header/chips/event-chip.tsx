import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { format, isSameDay, subDays } from "date-fns";
import { CalendarIcon, SearchIcon, SpeechIcon, VideoIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useHypr } from "@/contexts";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { commands as dbCommands, type Event } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { cn } from "@hypr/ui/lib/utils";
import { useSession, useSessions } from "@hypr/utils/contexts";
import { formatRelativeWithDay } from "@hypr/utils/datetime";

interface EventChipProps {
  sessionId: string;
}

interface EventWithMeetingLink extends Event {
  meetingLink?: string | null;
}

const isBlankNote = (session: any) => {
  return !session?.title?.trim()
    && !session?.raw_memo_html?.trim()
    && !session?.enhanced_memo_html?.trim();
};

export function EventChip({ sessionId }: EventChipProps) {
  const { userId, onboardingSessionId } = useHypr();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"event" | "date">("event");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isPopoverOpen) {
      setActiveTab("event");
    }
  }, [isPopoverOpen]);

  const {
    sessionCreatedAt,
    updateTitle,
    session: currentSessionDetails,
  } = useSession(sessionId, (s) => ({
    sessionCreatedAt: s.session.created_at,
    updateTitle: s.updateTitle,
    session: s.session,
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

  const detachEvent = useMutation({
    mutationFn: async () => {
      await dbCommands.setSessionEvent(sessionId, null);
    },
    onSuccess: async () => {
      queryClient.setQueryData(["event", sessionId], null);
      await event.refetch();
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setIsPopoverOpen(false);
    },
    onError: (error) => {
      console.error("Failed to detach session event:", error);
    },
  });

  const handleClickCalendar = () => {
    if (calendar.data) {
      if (calendar.data.platform === "Apple") {
        appleCalendarCommands.openCalendar();
      }
    }
  };

  const date = event.data?.start_date ?? sessionCreatedAt;

  if (onboardingSessionId === sessionId) {
    return (
      <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5" style={{ outline: "none" }}>
        <CalendarIcon size={14} />
        <p className="text-xs">{formatRelativeWithDay(date)}</p>
      </div>
    );
  }

  if (event.data) {
    return (
      <div style={{ outline: "none" }}>
        <style>
          {`
            .event-chip-container *:focus {
              outline: none !important;
              box-shadow: none !important;
              border-color: inherit !important;
            }
            .event-chip-container *:focus-visible {
              outline: none !important;
              box-shadow: none !important;
              border-color: inherit !important;
            }
          `}
        </style>
        <Popover>
          <PopoverTrigger>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex flex-row items-center gap-2 rounded-md px-2 py-1.5",
                      "hover:bg-neutral-100",
                      "event-chip-container",
                    )}
                  >
                    {event.data.meetingLink ? <VideoIcon size={14} /> : <SpeechIcon size={14} />}
                    <p className="text-xs">{formatRelativeWithDay(date)}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {format(new Date(date), "EEE, MMM d, yyyy 'at' h:mm a zzz")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </PopoverTrigger>

          <PopoverContent align="start" className="shadow-lg w-80 relative event-chip-container">
            {(() => {
              const startDateObj = new Date(event.data.start_date);
              const endDateObj = new Date(event.data.end_date);
              const formattedStartDate = formatRelativeWithDay(startDateObj.toISOString());
              const startTime = format(startDateObj, "p");
              const endTime = format(endDateObj, "p");
              let dateString;
              if (isSameDay(startDateObj, endDateObj)) {
                dateString = `${formattedStartDate}, ${startTime} - ${endTime}`;
              } else {
                const formattedEndDate = formatRelativeWithDay(endDateObj.toISOString());
                dateString = `${formattedStartDate}, ${startTime} - ${formattedEndDate}, ${endTime}`;
              }

              return (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => detachEvent.mutate()}
                    className="absolute top-4 right-4 p-1 bg-red-100 text-white rounded-full hover:bg-red-500 transition-colors z-10 focus:outline-none"
                    aria-label="Detach event"
                  >
                    <XIcon size={12} />
                  </button>
                  <div className="font-semibold">{event.data.name}</div>
                  <div className="text-sm text-neutral-500">{dateString}</div>

                  <div className="flex gap-2">
                    {event.data.meetingLink && (
                      <Button
                        onClick={() => {
                          const meetingLink = event.data?.meetingLink;
                          if (typeof meetingLink === "string") {
                            openUrl(meetingLink);
                          }
                        }}
                        className="flex-1 focus:outline-none"
                      >
                        <VideoIcon size={16} />
                        <Trans>Join meeting</Trans>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={handleClickCalendar}
                      disabled={!calendar.data}
                      className="flex-1 focus:outline-none"
                    >
                      <Trans>View in calendar</Trans>
                    </Button>
                  </div>

                  {event.data.note && (
                    <div className="border-t pt-2 text-sm text-neutral-600 whitespace-pre-wrap break-words max-h-40 overflow-y-auto scrollbar-none">
                      {event.data.note}
                    </div>
                  )}
                </div>
              );
            })()}
          </PopoverContent>
        </Popover>
      </div>
    );
  } else {
    const noteIsBlank = isBlankNote(currentSessionDetails);

    return (
      <div style={{ outline: "none" }}>
        <style>
          {`
            .event-chip-container *:focus {
              outline: none !important;
              box-shadow: none !important;
              border-color: inherit !important;
            }
            .event-chip-container *:focus-visible {
              outline: none !important;
              box-shadow: none !important;
              border-color: inherit !important;
            }
          `}
        </style>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 cursor-pointer event-chip-container">
              <CalendarIcon size={14} />
              <p className="text-xs">{formatRelativeWithDay(sessionCreatedAt)}</p>
            </div>
          </PopoverTrigger>

          <PopoverContent align="start" className="shadow-lg w-80 event-chip-container">
            {noteIsBlank
              ? (
                <div className="mt-1">
                  <EventTab
                    sessionId={sessionId}
                    userId={userId}
                    currentSessionDetails={currentSessionDetails}
                    updateTitle={updateTitle}
                    onSuccess={() => setIsPopoverOpen(false)}
                    queryClient={queryClient}
                  />
                </div>
              )
              : (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "event" | "date")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="event" className="focus:outline-none">Add Event</TabsTrigger>
                    <TabsTrigger value="date" className="focus:outline-none">Change Date</TabsTrigger>
                  </TabsList>

                  <TabsContent value="event" className="mt-4">
                    <EventTab
                      sessionId={sessionId}
                      userId={userId}
                      currentSessionDetails={currentSessionDetails}
                      updateTitle={updateTitle}
                      onSuccess={() => setIsPopoverOpen(false)}
                      queryClient={queryClient}
                    />
                  </TabsContent>

                  <TabsContent value="date" className="mt-4">
                    <DateTab
                      sessionId={sessionId}
                      currentSession={currentSessionDetails}
                      onSuccess={() => setIsPopoverOpen(false)}
                      queryClient={queryClient}
                    />
                  </TabsContent>
                </Tabs>
              )}
          </PopoverContent>
        </Popover>
      </div>
    );
  }
}

function EventTab({
  sessionId,
  userId,
  currentSessionDetails,
  updateTitle,
  onSuccess,
  queryClient,
}: {
  sessionId: string;
  userId: string;
  currentSessionDetails: any;
  updateTitle: any;
  onSuccess: () => void;
  queryClient: any;
}) {
  const [searchQuery, setSearchQuery] = useState("");

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
  });

  const assignEvent = useMutation({
    mutationFn: async (eventId: string) => {
      await dbCommands.setSessionEvent(sessionId, eventId);
      return eventId;
    },
    onSuccess: async (assignedEventId) => {
      const eventDetails = await dbCommands.getEvent(assignedEventId);
      if (eventDetails) {
        queryClient.setQueryData(["event", sessionId], { ...eventDetails, meetingLink: null });
      }

      await eventsInPastWithoutAssignedSession.refetch();
      queryClient.invalidateQueries({ queryKey: ["sessions"] });

      if (assignedEventId && updateTitle && currentSessionDetails && eventDetails?.name) {
        try {
          if (!currentSessionDetails.title?.trim()) {
            updateTitle(eventDetails.name);
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
          }
        } catch (error) {
          console.error("Failed to update session title after event assignment:", error);
        }
      }
      onSuccess();
    },
  });

  const handleSelectEvent = async (eventIdToLink: string) => {
    assignEvent.mutate(eventIdToLink, {
      onError: (error) => {
        console.error("Failed to set session event:", error);
      },
    });
  };

  const filteredEvents = (eventsInPastWithoutAssignedSession.data || [])
    .filter((ev: Event) => ev.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
        return 0;
      }
      if (isNaN(dateA.getTime())) {
        return 1;
      }
      if (isNaN(dateB.getTime())) {
        return -1;
      }
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <div>
      <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded-md bg-neutral-50 border border-neutral-200 transition-colors mb-2">
        <span className="text-neutral-500 flex-shrink-0">
          <SearchIcon className="size-4" />
        </span>
        <input
          type="text"
          placeholder="Search past events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none focus:ring-0 focus:border-transparent placeholder:text-neutral-400"
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
                className="flex flex-col items-start p-2 hover:bg-neutral-100 text-left w-full rounded-md focus:outline-none"
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
    </div>
  );
}

function DateTab({
  sessionId,
  currentSession,
  onSuccess,
  queryClient,
}: {
  sessionId: string;
  currentSession: any;
  onSuccess: () => void;
  queryClient: any;
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(currentSession.created_at));

  const { sessionsStore } = useSessions((s) => ({
    sessionsStore: s.sessions,
  }));

  const updateSessionDate = useMutation({
    mutationFn: async (newDate: Date) => {
      const updatedSession = {
        ...currentSession,
        created_at: newDate.toISOString(),
        visited_at: new Date().toISOString(),
      };
      await dbCommands.upsertSession(updatedSession);
      return updatedSession;
    },
    onSuccess: async () => {
      const sessionStore = sessionsStore[sessionId];
      if (sessionStore) {
        await sessionStore.getState().refresh();
      }

      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      onSuccess();
    },
    onError: (error) => {
      console.error("Failed to update session date:", error);
    },
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      const [year, month, day] = dateStr.split("-").map(Number);
      const newDate = new Date(year, month - 1, day); // month is 0-indexed

      const originalTime = new Date(currentSession.created_at);
      newDate.setHours(
        originalTime.getHours(),
        originalTime.getMinutes(),
        originalTime.getSeconds(),
        originalTime.getMilliseconds(),
      );

      if (!isNaN(newDate.getTime())) {
        setSelectedDate(newDate);
      }
    }
  };

  const handleSaveDate = () => {
    updateSessionDate.mutate(selectedDate);
  };

  const formatDateForInput = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          id="date-input"
          type="date"
          value={formatDateForInput(selectedDate)}
          onChange={handleDateChange}
          max={formatDateForInput(new Date())}
          min="1900-01-01"
          className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-0 focus:border-neutral-200"
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSaveDate}
          disabled={updateSessionDate.isPending}
          className="flex-1 focus:outline-none"
        >
          {updateSessionDate.isPending ? <Trans>Saving...</Trans> : <Trans>Save Date</Trans>}
        </Button>
      </div>
    </div>
  );
}
