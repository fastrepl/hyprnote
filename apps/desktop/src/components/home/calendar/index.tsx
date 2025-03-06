import { useEffect, useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  isWeekend,
  addDays,
  getDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";

import { type Event } from "@hypr/plugin-db";
import { Switch } from "@hypr/ui/components/ui/switch";

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

  const [showWeekends, setShowWeekends] = useState(true);
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

  // Determine view mode based on window width
  const getViewMode = () => {
    if (windowWidth >= 1200) return "month";
    if (windowWidth >= 900) return "4days";
    return "2days";
  };

  // Get visible days based on view mode
  const getVisibleDays = () => {
    const viewMode = getViewMode();

    if (viewMode === "month") {
      // For month view, show the entire month
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      // Start from the first day of the first week that contains the month start
      const firstDay = startOfWeek(monthStart);
      // End on the last day of the last week that contains the month end
      const lastDay = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: firstDay, end: lastDay });
    }

    // For 2-day and 4-day views, start from today
    const daysToShow = viewMode === "4days" ? 4 : 2;
    return eachDayOfInterval({
      start: today,
      end: addDays(today, daysToShow - 1),
    });
  };

  const visibleDays = getVisibleDays();
  const viewMode = getViewMode();

  // Get weekday headers based on view mode
  const getWeekdayHeaders = () => {
    if (viewMode === "month") {
      return weekDays;
    }
    return visibleDays.map((day) => weekDays[getDay(day)]);
  };

  // Get grid columns class based on view mode
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

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-medium">
          {viewMode === "month"
            ? format(today, "MMMM yyyy")
            : "Upcoming Events"}
        </h2>
        {viewMode === "month" && (
          <div className="flex items-center gap-2">
            <Switch
              id="show-weekends"
              checked={showWeekends}
              onCheckedChange={setShowWeekends}
              size="sm"
            />
            <label
              htmlFor="show-weekends"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Show weekends
            </label>
          </div>
        )}
      </div>

      <div className={`grid ${getGridColumnsClass()} gap-1`}>
        {getWeekdayHeaders().map((day) => (
          <div key={day} className="text-center font-semibold pb-2">
            {day}
          </div>
        ))}
        {visibleDays.map((day, i) => {
          const isPastDay =
            format(day, "yyyy-MM-dd") < format(today, "yyyy-MM-dd");
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, today);

          return (
            <div
              key={i}
              className={`min-h-[120px] border rounded-lg p-1 relative ${
                isWeekend(day) ? "bg-neutral-50" : "bg-white"
              } ${!isCurrentMonth ? "opacity-50" : ""} ${
                isToday(day) ? "border-blue-500 border-2" : "border-gray-200"
              } ${isPastDay ? "invisible" : ""}`}
            >
              <div className="text-sm text-right mb-1 pr-1">
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
