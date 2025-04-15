import { addDays, eachDayOfInterval, format, getDay, isSameMonth, startOfMonth, subDays } from "date-fns";
import { useEffect, useRef, useState } from "react";

import type { Event, Session } from "@hypr/plugin-db";
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

    if (isFutureDate) {
      return [...dayEvents, ...daySessions] as CalendarItem[];
    }

    if (isPastDate) {
      return daySessions as CalendarItem[];
    }

    return [...dayEvents, ...daySessions] as CalendarItem[];
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
                      {visibleItemsArray.map((item) => (
                        <div key={"id" in item ? item.id : ""}>
                          {"calendar_event_id" in item
                            ? <NoteCard session={item as Session} />
                            : <EventCard event={item as Event} />}
                        </div>
                      ))}
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
                          .map((item) => (
                            <div
                              key={item.id}
                              className="text-sm hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                            >
                              {"calendar_event_id" in item
                                ? <NoteCard session={item as Session} showTime />
                                : <EventCard event={item as Event} showTime />}
                            </div>
                          ))}
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
