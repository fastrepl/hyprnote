import { useEffect, useState } from "react";

import * as store from "@hypr/store";
import { useTabs } from "@hypr/tabs";
import { Button } from "@hypr/ui/components/ui/button";
import { ButtonGroup } from "@hypr/ui/components/ui/button-group";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  addDays,
  addMonths,
  cn,
  eachDayOfInterval,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subDays,
} from "@hypr/utils";

export interface ExtensionViewProps {
  extensionId: string;
  state?: Record<string, unknown>;
}

export default function CalendarExtensionView({
  extensionId,
  state,
}: ExtensionViewProps) {
  const [month, setMonth] = useState(() => {
    if (state?.month && typeof state.month === "string") {
      return new Date(state.month);
    }
    return new Date();
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const calendarIds = store.UI.useRowIds("calendars", store.STORE_ID);

  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(
    () => new Set(calendarIds),
  );

  useEffect(() => {
    setSelectedCalendars((prev) => {
      const next = new Set(prev);
      for (const id of calendarIds) {
        if (!prev.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [calendarIds]);

  const monthStart = startOfMonth(month);
  const startDayOfWeek = getDay(monthStart);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabel = format(month, "MMMM yyyy");

  const calendarStart = subDays(monthStart, startDayOfWeek);
  const totalCells = 42;
  const calendarEnd = addDays(calendarStart, totalCells - 1);
  const allDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  }).map((day) => format(day, "yyyy-MM-dd"));

  const handlePreviousMonth = () => {
    setMonth(addMonths(month, -1));
  };

  const handleNextMonth = () => {
    setMonth(addMonths(month, 1));
  };

  const handleToday = () => {
    setMonth(new Date());
  };

  return (
    <div className="flex h-full">
      {sidebarOpen && (
        <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col">
          <div className="p-2 text-sm border-b border-neutral-200 flex items-center gap-2">
            <Button
              size="icon"
              variant={sidebarOpen ? "default" : "ghost"}
              onClick={() => setSidebarOpen(false)}
            >
              <CalendarDaysIcon />
            </Button>
            My Calendars
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {calendarIds.map((id) => (
                <CalendarCheckboxRow
                  key={id}
                  id={id}
                  checked={selectedCalendars.has(id)}
                  onToggle={(checked) => {
                    if (checked) {
                      setSelectedCalendars((prev) => new Set([...prev, id]));
                    } else {
                      setSelectedCalendars((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0">
          <div className="p-2 flex items-center relative">
            {!sidebarOpen && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarOpen(true)}
              >
                <CalendarDaysIcon />
              </Button>
            )}
            <div className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">
              {monthLabel}
            </div>
            <ButtonGroup className="ml-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                className="shadow-none"
              >
                <ChevronLeftIcon />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-sm px-3 shadow-none"
                onClick={handleToday}
              >
                Today
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="shadow-none"
              >
                <ChevronRightIcon />
              </Button>
            </ButtonGroup>
          </div>

          <div className="grid grid-cols-7 border-b border-neutral-200">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={cn([
                  "text-center text-sm font-medium p-2",
                  index === 0 || index === 6 ? "text-black/70" : "text-black",
                ])}
              >
                {day}
              </div>
            ))}
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {Array.from({ length: 6 }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-1 min-h-0">
              {allDays
                .slice(weekIndex * 7, (weekIndex + 1) * 7)
                .map((day, dayIndex) => (
                  <CalendarDay
                    key={day}
                    day={day}
                    isCurrentMonth={isSameMonth(new Date(day), month)}
                    isFirstColumn={dayIndex === 0}
                    isLastRow={weekIndex === 5}
                    selectedCalendars={selectedCalendars}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarCheckboxRow({
  id,
  checked,
  onToggle,
}: {
  id: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const calendar = store.UI.useRow("calendars", id, store.STORE_ID);
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`calendar-${id}`}
        checked={checked}
        onCheckedChange={(v) => onToggle(Boolean(v))}
      />
      <label
        htmlFor={`calendar-${id}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {calendar?.name ?? "Untitled"}
      </label>
    </div>
  );
}

function CalendarDay({
  day,
  isCurrentMonth,
  isFirstColumn,
  isLastRow,
  selectedCalendars,
}: {
  day: string;
  isCurrentMonth: boolean;
  isFirstColumn: boolean;
  isLastRow: boolean;
  selectedCalendars: Set<string>;
}) {
  const allEventIds = store.UI.useSliceRowIds(
    store.INDEXES.eventsByDate,
    day,
    store.STORE_ID,
  );

  const storeInstance = store.UI.useStore(store.STORE_ID);

  const eventIds = allEventIds.filter((eventId) => {
    const event = storeInstance?.getRow("events", eventId);
    return (
      event?.calendar_id && selectedCalendars.has(event.calendar_id as string)
    );
  });

  const sessionIds = store.UI.useSliceRowIds(
    store.INDEXES.sessionByDateWithoutEvent,
    day,
    store.STORE_ID,
  );

  const dayNumber = format(new Date(day), "d");
  const isToday = format(new Date(), "yyyy-MM-dd") === day;
  const dayOfWeek = getDay(new Date(day));
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const totalItems = eventIds.length + sessionIds.length;
  const maxVisibleItems = 3;
  const visibleCount =
    totalItems > maxVisibleItems ? maxVisibleItems - 1 : totalItems;
  const hiddenCount = totalItems - visibleCount;

  const allItems = [
    ...eventIds.map((id) => ({ type: "event" as const, id })),
    ...sessionIds.map((id) => ({ type: "session" as const, id })),
  ];

  const visibleItems = allItems.slice(0, visibleCount);
  const hiddenItems = allItems.slice(visibleCount);

  const hiddenEventIds = hiddenItems
    .filter((item) => item.type === "event")
    .map((item) => item.id);
  const hiddenSessionIds = hiddenItems
    .filter((item) => item.type === "session")
    .map((item) => item.id);

  return (
    <div
      className={cn([
        "relative flex flex-col items-end flex-1 min-w-0 border-neutral-200 p-1 overflow-hidden",
        !isFirstColumn && "border-l",
        !isLastRow && "border-b",
        isWeekend ? "bg-neutral-50" : "bg-white",
      ])}
    >
      <div
        className={cn([
          "text-sm size-6 rounded-full flex items-center justify-center mb-1",
          isToday && "bg-red-500",
        ])}
      >
        <span
          className={cn([
            isToday && "text-white font-medium",
            !isToday && !isCurrentMonth && "text-neutral-400",
            !isToday && isCurrentMonth && isWeekend && "text-neutral-500",
            !isToday && isCurrentMonth && !isWeekend && "text-neutral-700",
          ])}
        >
          {dayNumber}
        </span>
      </div>

      <div className="flex-1 w-full">
        {visibleItems.map((item) =>
          item.type === "event" ? (
            <DayEvent key={item.id} eventId={item.id} />
          ) : (
            <DaySession key={item.id} sessionId={item.id} />
          ),
        )}

        {hiddenCount > 0 && (
          <DayMore
            day={day}
            eventIds={hiddenEventIds}
            sessionIds={hiddenSessionIds}
            hiddenCount={hiddenCount}
          />
        )}
      </div>
    </div>
  );
}

function DayEvent({ eventId }: { eventId: string }) {
  const event = store.UI.useRow("events", eventId, store.STORE_ID);
  const [open, setOpen] = useState(false);
  const openNew = useTabs((state) => state.openNew);

  const title = event?.title || "Untitled Event";

  const sessionIds = store.UI.useSliceRowIds(
    store.INDEXES.sessionsByEvent,
    eventId,
    store.STORE_ID,
  );
  const linkedSessionId = sessionIds[0];
  const linkedSession = store.UI.useRow(
    "sessions",
    linkedSessionId || "dummy",
    store.STORE_ID,
  );

  const handleOpenNote = () => {
    setOpen(false);

    if (linkedSessionId) {
      openNew({ type: "sessions", id: linkedSessionId });
    } else {
      openNew({ type: "sessions", id: crypto.randomUUID() });
    }
  };

  const formatEventTime = () => {
    if (!event || !event.started_at || !event.ended_at) {
      return "";
    }
    const start = new Date(event.started_at as string);
    const end = new Date(event.ended_at as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "";
    }

    if (isSameDay(start, end)) {
      return `${format(start, "MMM d")}, ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
    }
    return `${format(start, "MMM d")}, ${format(start, "h:mm a")} - ${format(end, "MMM d")}, ${format(end, "h:mm a")}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn([
            "w-full justify-start px-1 text-neutral-600 h-6",
            open && "bg-neutral-100 hover:bg-neutral-100",
          ])}
        >
          <CalendarIcon />
          <p className="truncate">{title}</p>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <div className="font-semibold text-lg text-neutral-800 mb-2">
          {title}
        </div>

        <p className="text-sm text-neutral-600 mb-4">{formatEventTime()}</p>

        {linkedSessionId ? (
          <Button className="w-full justify-start" onClick={handleOpenNote}>
            <StickyNoteIcon />
            <p className="truncate">
              {linkedSession?.title || "Untitled Note"}
            </p>
          </Button>
        ) : (
          <Button className="w-full" onClick={handleOpenNote}>
            <PenIcon />
            Create Note
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function DaySession({ sessionId }: { sessionId: string }) {
  const session = store.UI.useRow("sessions", sessionId, store.STORE_ID);
  const openNew = useTabs((state) => state.openNew);

  const eventId = session?.event_id ?? "";
  const event = store.UI.useRow("events", eventId as string, store.STORE_ID);

  const handleClick = () => {
    openNew({ type: "sessions", id: sessionId });
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start px-1 text-neutral-600 h-6"
      onClick={handleClick}
    >
      <StickyNoteIcon />
      <p className="truncate">
        {event && eventId ? event.title : session?.title || "Untitled"}
      </p>
    </Button>
  );
}

function DayMore({
  day,
  eventIds,
  sessionIds,
  hiddenCount,
}: {
  day: string;
  eventIds: string[];
  sessionIds: string[];
  hiddenCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start px-1 text-neutral-600 h-6"
        >
          +{hiddenCount} more
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4 max-h-96 space-y-2 overflow-y-auto bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0"
        align="start"
      >
        <div className="text-lg font-semibold text-neutral-800 mb-2">
          {format(new Date(day), "MMMM d, yyyy")}
        </div>

        <div className="space-y-1">
          {eventIds.map((eventId) => (
            <DayEvent key={eventId} eventId={eventId} />
          ))}
          {sessionIds.map((sessionId) => (
            <DaySession key={sessionId} sessionId={sessionId} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-pink-600"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function CalendarDaysIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function StickyNoteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-600"
    >
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    </svg>
  );
}
