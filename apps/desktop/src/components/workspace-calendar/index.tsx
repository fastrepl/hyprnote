import { type Event } from "@hypr/plugin-db";
import { cn } from "@hypr/ui/lib/utils";
import { addDays, eachDayOfInterval, format, getDay, isSameMonth, startOfMonth, subDays } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { DayEvents } from "./day-events";
import { mockEvents } from "./mock";

interface WorkspaceCalendarProps {
  currentDate?: Date;
  onMonthChange?: (date: Date) => void;
}

export default function WorkspaceCalendar({ currentDate, onMonthChange }: WorkspaceCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(currentDate || today);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [cellHeight, setCellHeight] = useState<number>(0);
  const [visibleEvents, setVisibleEvents] = useState<number>(2);

  const [events] = useState<Event[]>(mockEvents);

  // Update currentMonth when currentDate prop changes
  useEffect(() => {
    if (currentDate) {
      setCurrentMonth(currentDate);
    }
  }, [currentDate]);

  useEffect(() => {
    const updateCellHeight = () => {
      if (calendarRef.current) {
        const containerHeight = calendarRef.current.clientHeight;

        const newCellHeight = Math.floor(containerHeight / 6) - 1;
        setCellHeight(newCellHeight);

        const eventsPerCell = Math.max(1, Math.floor((newCellHeight - 30) / 20));
        setVisibleEvents(eventsPerCell);
      }
    };

    updateCellHeight();
    window.addEventListener("resize", updateCellHeight);
    return () => window.removeEventListener("resize", updateCellHeight);
  }, []);

  const getEventsForDay = (date: Date) => {
    return events.filter(
      (event) =>
        format(new Date(event.start_date), "yyyy-MM-dd")
          === format(date, "yyyy-MM-dd"),
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

  return (
    <div
      ref={calendarRef}
      className="grid grid-cols-7 divide-x divide-neutral-200 h-full grid-rows-6"
    >
      {/* Calendar days */}
      {calendarDays.map((day, i) => {
        const dayEvents = getEventsForDay(day);
        const isLastInRow = (i + 1) % 7 === 0;
        const dayNumber = format(day, "d");
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isHighlighted = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

        const visibleEventsArray = dayEvents.slice(0, visibleEvents);
        const hiddenEventsCount = dayEvents.length - visibleEventsArray.length;

        return (
          <div
            key={i}
            style={{ height: cellHeight > 0 ? `${cellHeight}px` : "auto" }}
            className={cn(
              "relative border-b border-neutral-200 flex flex-col",
              isCurrentMonth ? "bg-white" : "bg-neutral-50",
              isLastInRow && "border-r-0",
            )}
          >
            {/* Day number */}
            <div className="flex items-center justify-end p-1 min-h-[24px]">
              <div
                className={cn(
                  isHighlighted && "bg-red-500 rounded-full w-6 h-6 flex items-center justify-center",
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    isHighlighted
                      ? "text-white font-medium"
                      : isCurrentMonth
                      ? "text-neutral-700"
                      : "text-neutral-400",
                  )}
                >
                  {dayNumber}
                </span>
              </div>
            </div>

            {/* Events area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {isCurrentMonth && visibleEventsArray.length > 0 && <DayEvents date={day} events={visibleEventsArray} />}

              {/* Show "+X more" if there are hidden events */}
              {isCurrentMonth && hiddenEventsCount > 0 && (
                <div className="text-xs text-neutral-600 px-1 mt-1">
                  +{hiddenEventsCount} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
