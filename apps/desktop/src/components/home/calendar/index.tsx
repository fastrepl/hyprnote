import { useEffect, useState } from "react";
import {
  format,
  eachDayOfInterval,
  isToday,
  isWeekend,
  addDays,
  getDay,
} from "date-fns";

import { type Event } from "@hypr/plugin-db";

import { DayEvents } from "./day-events";
import { mockEvents } from "./mock";

const useWindowSize = () => {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
};

export default function WorkspaceCalendar() {
  const today = new Date();

  const windowWidth = useWindowSize();

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [events] = useState<Event[]>(mockEvents);

  const getEventsForDay = (date: Date) => {
    if (format(date, "yyyy-MM-dd") < format(today, "yyyy-MM-dd")) {
      return [];
    }
    return events.filter(
      (event) =>
        format(new Date(event.start_date), "yyyy-MM-dd") ===
        format(date, "yyyy-MM-dd"),
    );
  };

  const getViewMode = () => {
    if (windowWidth >= 1200) return "month";
    if (windowWidth >= 900) return "4days";
    return "2days";
  };

  const getVisibleDays = () => {
    const viewMode = getViewMode();

    if (viewMode === "month") {
      const endDate = addDays(today, 30);
      return eachDayOfInterval({ start: today, end: endDate });
    }

    const daysToShow = viewMode === "4days" ? 4 : 2;
    return eachDayOfInterval({
      start: today,
      end: addDays(today, daysToShow - 1),
    });
  };

  const visibleDays = getVisibleDays();
  const viewMode = getViewMode();

  const getWeekdayHeaders = () => {
    if (viewMode === "month") {
      return weekDays;
    }
    return visibleDays.map((day) => weekDays[getDay(day)]);
  };

  const getGridColumnsClass = () => {
    switch (viewMode) {
      case "month":
        return "grid-cols-7";
      case "4days":
        return "grid-cols-4";
      default:
        return "grid-cols-2";
    }
  };

  const getEmptyCellsCount = () => {
    if (viewMode !== "month") return 0;
    return getDay(today);
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium mb-6 border-b pb-1 ">
        {viewMode === "month" ? "Upcoming Events" : "Upcoming Events"}
      </h2>

      <div className={`grid ${getGridColumnsClass()} gap-1`}>
        {getWeekdayHeaders().map((day) => (
          <div key={day} className="text-center font-semibold pb-2 ">
            {day}
          </div>
        ))}
        {Array(getEmptyCellsCount())
          .fill(null)
          .map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[120px]" />
          ))}
        {visibleDays.map((day, i) => {
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={i}
              className={`min-h-[120px] border rounded-lg p-1 relative ${
                isWeekend(day) ? "bg-neutral-50 " : "bg-white "
              } ${
                isToday(day)
                  ? "border-blue-500 border-2"
                  : "border-neutral-700 "
              }`}
            >
              <div className="text-sm text-right mb-1 pr-1 ">
                {format(day, "d")}
              </div>
              <DayEvents date={day} events={dayEvents} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
