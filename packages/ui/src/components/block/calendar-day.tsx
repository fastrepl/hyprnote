import clsx from "clsx";
import { CalendarItem } from "./calendar-item";

interface CalendarEvent {
  id: string;
  title: string;
}

interface CalendarDayProps {
  dayNumber: string;
  isToday: boolean;
  events: CalendarEvent[];
}

export const CalendarDay = ({ dayNumber, isToday, events }: CalendarDayProps) => {
  return (
    <div
      className={clsx([
        "h-32 max-h-32 p-2 border rounded-md flex flex-col overflow-hidden bg-background border-border",
      ])}
    >
      <div
        className={clsx([
          "text-sm font-medium mb-1 flex-shrink-0",
          isToday && "text-blue-600",
        ])}
      >
        {dayNumber}
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {events?.map((event) => (
          <CalendarItem key={event.id} eventName={event.title} />
        ))}
      </div>
    </div>
  );
};