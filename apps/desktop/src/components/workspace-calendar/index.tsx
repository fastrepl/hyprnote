import type { Session } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/ui/lib/utils";
import { addDays, eachDayOfInterval, format, getDay, isSameMonth, startOfMonth, subDays } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { DayEvents, EventCard } from "./day-events";

interface WorkspaceCalendarProps {
  sessions: Session[];
  currentDate?: Date;
}

const HEADER_HEIGHT = 32;
const EVENT_HEIGHT = 20;

export default function WorkspaceCalendar({ sessions, currentDate }: WorkspaceCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(currentDate || today);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [cellHeight, setCellHeight] = useState<number>(75);
  const [visibleEvents, setVisibleEvents] = useState<number>(2);

  useEffect(() => {
    if (currentDate) {
      setCurrentMonth(currentDate);
    }
  }, [currentDate]);

  useEffect(() => {
    const updateCellHeight = (containerHeight: number) => {
      const newCellHeight = Math.floor(containerHeight / 6) - 1;
      setCellHeight(newCellHeight);

      const availableHeight = newCellHeight - HEADER_HEIGHT;

      let maxEvents = 0;

      if (availableHeight < 2 * EVENT_HEIGHT) {
        maxEvents = 0;
      } else if (availableHeight < 3 * EVENT_HEIGHT) {
        maxEvents = 1;
      } else if (availableHeight < 4 * EVENT_HEIGHT) {
        maxEvents = 2;
      } else if (availableHeight < 5 * EVENT_HEIGHT) {
        maxEvents = 3;
      } else if (availableHeight < 6 * EVENT_HEIGHT) {
        maxEvents = 4;
      } else if (availableHeight < 7 * EVENT_HEIGHT) {
        maxEvents = 5;
      } else if (availableHeight < 8 * EVENT_HEIGHT) {
        maxEvents = 6;
      } else if (availableHeight < 9 * EVENT_HEIGHT) {
        maxEvents = 7;
      } else if (availableHeight < 10 * EVENT_HEIGHT) {
        maxEvents = 8;
      } else if (availableHeight < 11 * EVENT_HEIGHT) {
        maxEvents = 9;
      } else if (availableHeight < 12 * EVENT_HEIGHT) {
        maxEvents = 10;
      }

      setVisibleEvents(maxEvents);
    };

    const observer = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        const height = entry.contentRect.height;
        console.log("Height:", height);
        if (height > 75 * 6) updateCellHeight(height);
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
      (session) => format(new Date(session.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
    );
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);

    const startDay = getDay(monthStart);
    const firstDayToShow = subDays(monthStart, startDay === 0 ? 6 : startDay - 1);

    const lastDayToShow = addDays(firstDayToShow, 41);

    return eachDayOfInterval({ start: firstDayToShow, end: lastDayToShow });
  };

  const calendarDays = getCalendarDays();

  console.log("Cell height:", cellHeight);

  return (
    <div
      ref={calendarRef}
      className="grid grid-cols-7 divide-x divide-neutral-200 h-full grid-rows-6 gap-0"
    >
      {calendarDays.map((day, i) => {
        const daySessions = getSessionsForDay(day);
        const isLastInRow = (i + 1) % 7 === 0;
        const isWeekend = isLastInRow || (i + 1) % 7 === 6;
        const isLastWeek = i >= 35;
        const dayNumber = format(day, "d");
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isHighlighted = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
        const isFirstDayOfMonth = dayNumber === "1";
        const monthName = isFirstDayOfMonth ? format(day, "MMM") : "";

        const visibleSessionsArray = daySessions.slice(0, visibleEvents);
        const hiddenSessionsCount = daySessions.length - visibleEvents;

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
            <div className="flex items-center justify-end pt-1 px-1 text-sm h-8">
              <div className={cn("flex items-end gap-1", isHighlighted && "items-center")}>
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
                  className={cn(isHighlighted && "bg-red-500 rounded-full w-6 h-6 flex items-center justify-center")}
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
              {isCurrentMonth && daySessions.length > 0 && (
                <>
                  {visibleSessionsArray.length > 0 && <DayEvents sessions={visibleSessionsArray} />}

                  {(hiddenSessionsCount > 0) && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="text-xs text-neutral-600 rounded py-0.5 cursor-pointer hover:bg-neutral-200 mx-1">
                          {`+${hiddenSessionsCount} more`}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-80 p-4 max-h-80 space-y-1 overflow-y-auto bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0"
                        align="start"
                      >
                        <div className="text-lg font-semibold text-neutral-800">
                          {format(day, "MMMM d, yyyy")}
                        </div>

                        {daySessions.map((session) => (
                          <div
                            key={session.id}
                            className="text-sm hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                          >
                            <EventCard session={session} showTime />
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
