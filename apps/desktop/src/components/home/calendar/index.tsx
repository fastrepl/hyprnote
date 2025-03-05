import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  isWeekend,
  addWeeks,
} from "date-fns";
import { useState } from "react";
import { type Event } from "@hypr/plugin-db";
import { Switch } from "@hypr/ui/components/ui/switch";
import { DayEvents } from "./day-events";
import { mockEvents } from "./mock";

export default function WorkspaceCalendar() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const calendarStart = weekStart;
  const calendarEnd = endOfWeek(addWeeks(weekStart, 3));
  const [showWeekends, setShowWeekends] = useState(true);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [events] = useState<Event[]>(mockEvents);

  const getEventsForDay = (date: Date) => {
    if (format(date, "yyyy-MM-dd") < format(today, "yyyy-MM-dd")) {
      return [];
    }
    return events.filter(
      (event) =>
        format(new Date(event.start_date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
    );
  };

  const filteredDays = days.filter((day) => showWeekends || !isWeekend(day));
  const filteredWeekDays = showWeekends ? weekDays : weekDays.slice(1, 6);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Upcoming Events</h2>
        <div className="flex items-center gap-2">
          <Switch
            id="show-weekends"
            checked={showWeekends}
            onCheckedChange={setShowWeekends}
          />
          <label
            htmlFor="show-weekends"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Show weekends
          </label>
        </div>
      </div>

      <div
        className={`grid ${showWeekends ? "grid-cols-7" : "grid-cols-5"} gap-1`}
      >
        {filteredWeekDays.map((day) => (
          <div key={day} className="text-center font-semibold pb-2">
            {day}
          </div>
        ))}
        {filteredDays.map((day, i) => {
          const isPastDay =
            format(day, "yyyy-MM-dd") < format(today, "yyyy-MM-dd");
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={i}
              className={`min-h-[120px] border rounded-lg p-1 relative ${
                isWeekend(day) ? "bg-neutral-50" : "bg-white"
              } ${!isSameMonth(day, today) ? "opacity-50" : ""} ${
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
