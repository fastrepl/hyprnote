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
import {
  CalendarCogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { ButtonGroup } from "@hypr/ui/components/ui/button-group";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/store/main";
import { useTabs } from "../../../../store/zustand/tabs";
import { SettingsCalendar } from "../../../settings/calendar";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);

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
    <div className="flex h-full overflow-hidden">
      <div
        className={cn([
          "border-r border-neutral-200 overflow-y-auto transition-all duration-200",
          showSettings ? "w-72 p-4" : "w-0 p-0 border-r-0",
        ])}
      >
        {showSettings && <SettingsCalendar />}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div
          className={cn([
            "flex items-center justify-between",
            "px-2 pt-1 pb-1 border-b border-neutral-200",
          ])}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings((v) => !v)}
            >
              <CalendarCogIcon className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-neutral-900">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
          </div>
          <ButtonGroup>
            <Button
              variant="outline"
              size="icon"
              className="shadow-none"
              onClick={goToPrevMonth}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shadow-none px-3"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shadow-none"
              onClick={goToNextMonth}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </ButtonGroup>
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

      <div
        className={cn([
          "border-l border-neutral-200 overflow-y-auto transition-all duration-200",
          showSettings ? "w-72 p-4" : "w-0 p-0 border-l-0",
        ])}
      >
        {showSettings && <SettingsCalendar />}
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
  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionByDateWithoutEvent,
    dateKey,
    main.STORE_ID,
  );

  const totalItems = eventIds.length + sessionIds.length;
  const today = isToday(day);

  return (
    <div
      className={cn([
        "border-b border-r border-neutral-100",
        "p-1.5 min-h-[80px]",
        !isCurrentMonth && "bg-neutral-50",
      ])}
    >
      <div className="flex justify-end">
        <div
          className={cn([
            "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
            today && "bg-neutral-900 text-white",
            !today && isCurrentMonth && "text-neutral-900",
            !today && !isCurrentMonth && "text-neutral-400",
          ])}
        >
          {format(day, "d")}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        {eventIds.slice(0, 5).map((eventId) => (
          <EventChip key={eventId} eventId={eventId} />
        ))}
        {sessionIds
          .slice(0, Math.max(0, 5 - eventIds.length))
          .map((sessionId) => (
            <SessionChip key={sessionId} sessionId={sessionId} />
          ))}
        {totalItems > 5 && (
          <span className="text-xs text-neutral-400 pl-1">
            +{totalItems - 5} more
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

function SessionChip({ sessionId }: { sessionId: string }) {
  const session = main.UI.useResultRow(
    main.QUERIES.timelineSessions,
    sessionId,
    main.STORE_ID,
  );
  const openNew = useTabs((state) => state.openNew);

  const handleClick = useCallback(() => {
    openNew({ type: "sessions", id: sessionId });
  }, [openNew, sessionId]);

  if (!session || !session.title) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className={cn([
        "text-xs leading-tight truncate rounded px-1.5 py-0.5 text-left w-full",
        "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer",
      ])}
    >
      {session.title as string}
    </button>
  );
}
