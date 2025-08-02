import { useQuery } from "@tanstack/react-query";
import { addDays, eachDayOfInterval, format, getDay, isSameMonth, startOfMonth, subDays } from "date-fns";
import { useEffect, useRef, useState } from "react";

import type { Event, Session } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/ui/lib/utils";
import { EventCard } from "./event-card";
import { NoteCard } from "./note-card";

interface WorkspaceCalendarProps {
  events: Event[];
  sessions: Session[];
  month: Date;
}

type CalendarItem = Event | Session;

const HEADER_HEIGHT = 32;
const EVENT_HEIGHT = 20;

export default function WorkspaceCalendar({
  sessions,
  events,
  month,
}: WorkspaceCalendarProps) {
  const today = new Date();

  const calendarRef = useRef<HTMLDivElement>(null);

  // Batch fetch all participants for all sessions
  const allSessionIds = sessions.map(s => s.id);
  const batchParticipants = useQuery({
    queryKey: ["batch-participants", allSessionIds],
    queryFn: async () => {
      if (allSessionIds.length === 0) {
        return {};
      }
      const results = await Promise.all(
        allSessionIds.map(async (sessionId) => {
          const participants = await dbCommands.sessionListParticipants(sessionId);
          return {
            sessionId,
            participants: participants.sort((a, b) => {
              if (a.is_user && !b.is_user) {
                return 1;
              }
              if (!a.is_user && b.is_user) {
                return -1;
              }
              return 0;
            }),
          };
        }),
      );
      return Object.fromEntries(results.map(r => [r.sessionId, r.participants]));
    },
    enabled: allSessionIds.length > 0,
  });

  // Batch fetch linked events for sessions that have calendar_event_id
  const sessionsWithEventIds = sessions.filter(s => s.calendar_event_id);
  const batchLinkedEvents = useQuery({
    queryKey: ["batch-linked-events", sessionsWithEventIds.map(s => s.calendar_event_id)],
    queryFn: async () => {
      if (sessionsWithEventIds.length === 0) {
        return {};
      }
      const results = await Promise.all(
        sessionsWithEventIds.map(async (session) => {
          const event = await dbCommands.getEvent(session.calendar_event_id!);
          return { sessionId: session.id, event };
        }),
      );
      return Object.fromEntries(results.map(r => [r.sessionId, r.event]));
    },
    enabled: sessionsWithEventIds.length > 0,
  });

  // Batch fetch sessions for events
  const allEventIds = events.map(e => e.id);
  const batchEventSessions = useQuery({
    queryKey: ["batch-event-sessions", allEventIds],
    queryFn: async () => {
      if (allEventIds.length === 0) {
        return {};
      }
      const results = await Promise.all(
        allEventIds.map(async (eventId) => {
          const session = await dbCommands.getSession({ calendarEventId: eventId });
          return { eventId, session };
        }),
      );
      return Object.fromEntries(results.map(r => [r.eventId, r.session]));
    },
    enabled: allEventIds.length > 0,
  });

  const [currentMonth, setCurrentMonth] = useState(month);
  const [cellHeight, setCellHeight] = useState<number>(75);
  const [visibleEvents, setVisibleEvents] = useState<number>(2);

  useEffect(() => {
    if (month) {
      setCurrentMonth(month);
    }
  }, [month]);

  useEffect(() => {
    const updateCellHeight = (containerHeight: number) => {
      const newCellHeight = Math.floor(containerHeight / 6) - 1;
      setCellHeight(newCellHeight);

      const availableHeight = newCellHeight + 1 - HEADER_HEIGHT + 18;
      const maxPossibleEvents = Math.floor(availableHeight / EVENT_HEIGHT);
      const maxEvents = maxPossibleEvents >= 2 ? maxPossibleEvents - 1 : 0;
      setVisibleEvents(maxEvents);
    };

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const height = entry.contentRect.height;
        if (height > 75 * 6) {
          updateCellHeight(height);
        }
      });
    });

    if (calendarRef.current) {
      observer.observe(calendarRef.current);
      updateCellHeight(75 * 6);
    }

    return () => observer.disconnect();
  }, []);

  const getSessionsForDay = (date: Date) => {
    return sessions.filter(
      (session) =>
        format(new Date(session.created_at), "yyyy-MM-dd")
          === format(date, "yyyy-MM-dd"),
    );
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(
      (event) =>
        format(new Date(event.start_date), "yyyy-MM-dd")
          === format(date, "yyyy-MM-dd"),
    );
  };

  const getItemsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const todayStr = format(today, "yyyy-MM-dd");
    const isFutureDate = dateStr > todayStr;
    const isPastDate = dateStr < todayStr;

    const daySessions = getSessionsForDay(date);
    const dayEvents = getEventsForDay(date);

    // Filter out sessions that are linked to events to prevent duplicate display
    // When a session is linked to an event, show only the event (not both)
    const unlinkedSessions = daySessions.filter(session => {
      // If session has calendar_event_id, check if that event exists in current events
      if (session.calendar_event_id) {
        // If the linked event exists in our events list, don't show the session separately
        return !events.some(event => event.id === session.calendar_event_id);
      }
      // Session without calendar_event_id can be shown
      return true;
    });

    if (isFutureDate) {
      return [...dayEvents, ...unlinkedSessions] as CalendarItem[];
    }

    if (isPastDate) {
      return unlinkedSessions as CalendarItem[];
    }

    return [...dayEvents, ...unlinkedSessions] as CalendarItem[];
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);

    const startDay = getDay(monthStart);
    const firstDayToShow = subDays(
      monthStart,
      startDay === 0 ? 6 : startDay - 1,
    );

    const lastDayToShow = addDays(firstDayToShow, 41);

    return eachDayOfInterval({ start: firstDayToShow, end: lastDayToShow });
  };

  const calendarDays = getCalendarDays();

  return (
    <div
      ref={calendarRef}
      className="grid grid-cols-7 divide-x divide-neutral-200 h-full grid-rows-6 gap-0"
    >
      {calendarDays.map((day, i) => {
        const dayItems = getItemsForDay(day);
        const isLastInRow = (i + 1) % 7 === 0;
        const isWeekend = isLastInRow || (i + 1) % 7 === 6;
        const isLastWeek = i >= 35;
        const dayNumber = format(day, "d");
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isHighlighted = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
        const isFirstDayOfMonth = dayNumber === "1";
        const monthName = isFirstDayOfMonth ? format(day, "MMM") : "";

        const totalItems = dayItems.length;
        const maxPossibleEvents = Math.floor(
          (cellHeight + 1 - HEADER_HEIGHT) / EVENT_HEIGHT,
        );
        const visibleCount = maxPossibleEvents >= 2 && totalItems > maxPossibleEvents
          ? maxPossibleEvents - 1
          : Math.min(totalItems, visibleEvents);

        const visibleItemsArray = dayItems
          .sort((a, b) => {
            const aDate = "calendar_event_id" in a
              ? new Date(a.created_at)
              : new Date(a.start_date);
            const bDate = "calendar_event_id" in b
              ? new Date(b.created_at)
              : new Date(b.start_date);
            return aDate.getTime() - bDate.getTime();
          })
          .slice(0, visibleCount);

        const hiddenCount = totalItems > maxPossibleEvents
          ? totalItems - maxPossibleEvents + 1
          : totalItems - visibleCount;

        return (
          <div
            key={i}
            style={{ height: cellHeight > 0 ? `${cellHeight}px` : "auto" }}
            className={cn(
              "relative flex flex-col",
              !isLastWeek && "border-b border-neutral-200",
              isWeekend ? "bg-neutral-50" : "bg-white",
            )}
          >
            <div className="flex items-center justify-end px-1 text-sm h-8">
              <div
                className={cn(
                  "flex items-end gap-1",
                  isHighlighted && "items-center",
                )}
              >
                {isFirstDayOfMonth && (
                  <span
                    className={cn(
                      !isCurrentMonth
                        ? "text-neutral-400"
                        : isWeekend
                        ? "text-neutral-500"
                        : "text-neutral-700",
                    )}
                  >
                    {monthName}
                  </span>
                )}

                <div
                  className={cn(
                    isHighlighted
                      && "bg-red-500 rounded-full w-6 h-6 flex items-center justify-center",
                  )}
                >
                  <span
                    className={cn(
                      isHighlighted
                        ? "text-white font-medium"
                        : !isCurrentMonth
                        ? "text-neutral-400"
                        : isWeekend
                        ? "text-neutral-500"
                        : "text-neutral-700",
                    )}
                  >
                    {dayNumber}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {dayItems.length > 0 && (
                <>
                  {visibleItemsArray.length > 0 && (
                    <div className="px-1">
                      {visibleItemsArray.map((item) => {
                        const key = "id" in item ? item.id : "";
                        if ("calendar_event_id" in item) {
                          const session = item as Session;
                          const participants = batchParticipants.data?.[session.id] || [];
                          const linkedEvent = batchLinkedEvents.data?.[session.id] || null;
                          return (
                            <div key={key}>
                              <NoteCard
                                session={session}
                                participants={participants}
                                linkedEvent={linkedEvent}
                              />
                            </div>
                          );
                        } else {
                          const event = item as Event;
                          const session = batchEventSessions.data?.[event.id] || null;
                          const participants = session ? (batchParticipants.data?.[session.id] || []) : [];
                          return (
                            <div key={key}>
                              <EventCard
                                event={event}
                                session={session}
                                participants={participants}
                              />
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}

                  {hiddenCount > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="text-xs text-neutral-600 rounded py-0.5 cursor-pointer hover:bg-neutral-200 mx-1 h-5">
                          {`+${hiddenCount} more`}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-80 p-4 max-h-52 space-y-1 overflow-y-auto bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0"
                        align="start"
                      >
                        <div className="text-lg font-semibold text-neutral-800">
                          {format(day, "MMMM d, yyyy")}
                        </div>

                        {dayItems
                          .sort((a, b) => {
                            const aDate = "calendar_event_id" in a
                              ? new Date(a.created_at)
                              : new Date(a.start_date);
                            const bDate = "calendar_event_id" in b
                              ? new Date(b.created_at)
                              : new Date(b.start_date);
                            return aDate.getTime() - bDate.getTime();
                          })
                          .map((item) => {
                            const key = item.id;
                            if ("calendar_event_id" in item) {
                              const session = item as Session;
                              const participants = batchParticipants.data?.[session.id] || [];
                              const linkedEvent = batchLinkedEvents.data?.[session.id] || null;
                              return (
                                <div
                                  key={key}
                                  className="text-sm hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                                >
                                  <NoteCard
                                    session={session}
                                    showTime
                                    participants={participants}
                                    linkedEvent={linkedEvent}
                                  />
                                </div>
                              );
                            } else {
                              const event = item as Event;
                              const session = batchEventSessions.data?.[event.id] || null;
                              const participants = session ? (batchParticipants.data?.[session.id] || []) : [];
                              return (
                                <div
                                  key={key}
                                  className="text-sm hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                                >
                                  <EventCard
                                    event={event}
                                    showTime
                                    session={session}
                                    participants={participants}
                                  />
                                </div>
                              );
                            }
                          })}
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
