import clsx from "clsx";
import { CalendarItem } from "./calendar-item";

interface CalendarEvent {
  id: string;
  title: string;
}

interface CalendarDayProps {
  dayNumber: string;
  isToday: boolean;
  isWeekend?: boolean;
  isCurrentMonth?: boolean;
  monthName?: string;
  events: CalendarEvent[];
}

export const CalendarDay = ({
  dayNumber,
  isToday,
  isWeekend = false,
  isCurrentMonth = true,
  monthName,
  events,
}: CalendarDayProps) => {
  return (
    <div
      className={clsx([
        "h-32 relative flex flex-col border-b border-neutral-200",
        isWeekend ? "bg-neutral-50" : "bg-white",
      ])}
    >
      {/* Header with day number */}
      <div className="flex items-center justify-end px-1 text-sm h-8">
        <div className={clsx("flex items-end gap-1", isToday && "items-center")}>
          {monthName && (
            <span
              className={clsx(
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
            className={clsx(
              isToday && "bg-red-500 rounded-full w-6 h-6 flex items-center justify-center",
            )}
          >
            <span
              className={clsx(
                isToday
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

      {/* Events area */}
      <div className="flex-1 overflow-hidden flex flex-col px-1">
        <div className="space-y-1">
          {events?.map((event) => <CalendarItem key={event.id} eventName={event.title} />)}
        </div>
      </div>
    </div>
  );
};
