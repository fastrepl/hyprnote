import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, SettingsIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/store/main";
import { useTabs } from "../../../../store/zustand/tabs";
import { SettingsCalendar } from "../../../settings/calendar";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const goToPrevMonth = useCallback(
    () => setCurrentMonth((m) => subMonths(m, 1)),
    [],
  );
  const goToNextMonth = useCallback(
    () => setCurrentMonth((m) => addMonths(m, 1)),
    [],
  );
  const goToToday = useCallback(() => setCurrentMonth(new Date()), []);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn([
          "flex items-center justify-between",
          "px-4 py-3 border-b border-neutral-200",
        ])}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 max-h-[400px] overflow-y-auto"
            >
              <SettingsCalendar />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-neutral-200">
        {WEEKDAY_HEADERS.map((day) => (
          <div
            key={day}
            className={cn([
              "text-center text-xs font-medium text-neutral-500",
              "py-2",
            ])}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            isCurrentMonth={isSameMonth(day, currentMonth)}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  isCurrentMonth,
}: {
  day: Date;
  isCurrentMonth: boolean;
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const eventIds = main.UI.useSliceRowIds(
    main.INDEXES.eventsByDate,
    dateKey,
    main.STORE_ID,
  );

  const today = isToday(day);

  return (
    <div
      className={cn([
        "border-b border-r border-neutral-100",
        "p-1 min-h-[80px]",
        !isCurrentMonth && "bg-neutral-50",
      ])}
    >
      <div
        className={cn([
          "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
          today && "bg-neutral-900 text-white",
          !today && isCurrentMonth && "text-neutral-900",
          !today && !isCurrentMonth && "text-neutral-400",
        ])}
      >
        {format(day, "d")}
      </div>
      <div className="flex flex-col gap-0.5">
        {eventIds.slice(0, 3).map((eventId) => (
          <EventChip key={eventId} eventId={eventId} />
        ))}
        {eventIds.length > 3 && (
          <span className="text-[10px] text-neutral-400 pl-1">
            +{eventIds.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

function EventChip({ eventId }: { eventId: string }) {
  const event = main.UI.useResultRow(
    main.QUERIES.timelineEvents,
    eventId,
    main.STORE_ID,
  );
  const openNew = useTabs((state) => state.openNew);

  const sessionIds = main.UI.useLocalRowIds(
    main.RELATIONSHIPS.sessionToEvent,
    eventId,
    main.STORE_ID,
  );
  const sessionId = sessionIds[0] ?? null;

  const handleClick = useCallback(() => {
    if (sessionId) {
      openNew({ type: "sessions", id: sessionId });
    }
  }, [openNew, sessionId]);

  if (!event || !event.title || event.ignored) {
    return null;
  }

  const startedAt = event.started_at
    ? format(new Date(event.started_at as string), "HH:mm")
    : null;

  return (
    <button
      onClick={sessionId ? handleClick : undefined}
      className={cn([
        "text-[10px] leading-tight truncate rounded px-1 py-0.5 text-left w-full",
        sessionId
          ? "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 cursor-pointer"
          : "bg-neutral-100 text-neutral-500",
      ])}
    >
      {startedAt && <span className="font-medium">{startedAt} </span>}
      {event.title as string}
    </button>
  );
}
