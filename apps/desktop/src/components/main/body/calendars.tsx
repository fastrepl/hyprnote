import { Button } from "@hypr/ui/components/ui/button";
import { ButtonGroup } from "@hypr/ui/components/ui/button-group";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
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

import { Calendar, CalendarDays, ChevronLeft, ChevronRight, FileText, Pen } from "lucide-react";
import { useState } from "react";

import * as persisted from "../../../store/tinybase/persisted";
import { type Tab, useTabs } from "../../../store/zustand/tabs";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemCalendar: TabItem = (
  {
    tab,
    handleCloseThis,
    handleSelectThis,
    handleCloseOthers,
    handleCloseAll,
  },
) => {
  return (
    <TabItemBase
      icon={<Calendar size={16} />}
      title={"Calendar"}
      active={tab.active}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentCalendar({ tab }: { tab: Tab }) {
  if (tab.type !== "calendars") {
    return null;
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { openCurrent } = useTabs();

  const calendarIds = persisted.UI.useRowIds("calendars", persisted.STORE_ID);

  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(() => new Set(calendarIds));

  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
  };
  const monthStart = startOfMonth(tab.month);
  const startDayOfWeek = getDay(monthStart);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabel = format(tab.month, "MMMM yyyy");

  // Calculate all days to display including previous and next month
  const calendarStart = subDays(monthStart, startDayOfWeek);
  const totalCells = 42; // 6 rows * 7 days
  const calendarEnd = addDays(calendarStart, totalCells - 1);
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map((day) => format(day, "yyyy-MM-dd"));

  const handlePreviousMonth = () => {
    openCurrent({ ...tab, month: addMonths(tab.month, -1) });
  };

  const handleNextMonth = () => {
    openCurrent({ ...tab, month: addMonths(tab.month, 1) });
  };

  const handleToday = () => {
    openCurrent({ ...tab, month: new Date() });
  };

  return (
    <StandardTabWrapper>
      <div className="flex h-full">
        {sidebarOpen && (
          <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col">
            <div className="p-2 border-b border-neutral-200 flex items-center gap-2">
              <Button size="icon" variant={sidebarOpen ? "default" : "ghost"} onClick={() => setSidebarOpen(false)}>
                <CalendarDays size={16} />
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
                    onToggle={() => toggleCalendar(id)}
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
                <Button size="icon" variant="ghost" onClick={() => setSidebarOpen(true)}>
                  <CalendarDays size={16} />
                </Button>
              )}
              <div className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">{monthLabel}</div>
              <ButtonGroup className="ml-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                >
                  <ChevronLeft size={16} />
                </Button>

                <Button
                  variant="outline"
                  className="text-sm px-3"
                  onClick={handleToday}
                >
                  Today
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                >
                  <ChevronRight size={16} />
                </Button>
              </ButtonGroup>
            </div>

            <div className="grid grid-cols-7 border-b border-neutral-200">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>
          </header>

          <div className="flex-1 flex flex-col overflow-hidden">
            {Array.from({ length: 6 }).map((_, weekIndex) => (
              <div key={weekIndex} className="flex flex-1 min-h-0">
                {allDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => (
                  <TabContentCalendarDay
                    key={day}
                    day={day}
                    isCurrentMonth={isSameMonth(new Date(day), tab.month)}
                    isFirstColumn={dayIndex === 0}
                    isLastColumn={dayIndex === 6}
                    isLastRow={weekIndex === 5}
                    selectedCalendars={selectedCalendars}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </StandardTabWrapper>
  );
}

function CalendarCheckboxRow(
  { id, checked, onToggle }: { id: string; checked: boolean; onToggle: () => void },
) {
  const calendar = persisted.UI.useRow("calendars", id, persisted.STORE_ID);
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id={`calendar-${id}`} checked={checked} onCheckedChange={onToggle} />
      <label
        htmlFor={`calendar-${id}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {calendar?.name ?? "Untitled"}
      </label>
    </div>
  );
}

function TabContentCalendarDay({
  day,
  isCurrentMonth,
  isFirstColumn,
  isLastRow,
  selectedCalendars,
}: {
  day: string;
  isCurrentMonth: boolean;
  isFirstColumn: boolean;
  isLastColumn: boolean;
  isLastRow: boolean;
  selectedCalendars: Set<string>;
}) {
  const allEventIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.eventsByDate,
    day,
    persisted.STORE_ID,
  );

  const store = persisted.UI.useStore(persisted.STORE_ID);

  const eventIds = allEventIds.filter((eventId) => {
    const event = store?.getRow("events", eventId);
    return event?.calendar_id && selectedCalendars.has(event.calendar_id as string);
  });

  const sessionIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionByDateWithoutEvent,
    day,
    persisted.STORE_ID,
  );

  const dayNumber = format(new Date(day), "d");
  const isToday = format(new Date(), "yyyy-MM-dd") === day;
  const dayOfWeek = getDay(new Date(day));
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const HEADER_HEIGHT = 32;
  const EVENT_HEIGHT = 20;
  const CELL_HEIGHT = 128;
  const availableHeight = CELL_HEIGHT - HEADER_HEIGHT;
  const maxPossibleEvents = Math.floor(availableHeight / EVENT_HEIGHT);

  const totalItems = eventIds.length + sessionIds.length;
  const visibleCount = totalItems > maxPossibleEvents
    ? maxPossibleEvents - 1
    : totalItems;
  const hiddenCount = totalItems - visibleCount;

  const allItems = [
    ...eventIds.map(id => ({ type: "event" as const, id })),
    ...sessionIds.map(id => ({ type: "session" as const, id })),
  ];

  const visibleItems = allItems.slice(0, visibleCount);
  const hiddenItems = allItems.slice(visibleCount);

  const hiddenEventIds = hiddenItems
    .filter(item => item.type === "event")
    .map(item => item.id);
  const hiddenSessionIds = hiddenItems
    .filter(item => item.type === "session")
    .map(item => item.id);

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
        className={cn(
          "text-xs size-6 rounded-full flex items-center justify-center mb-1",
          isToday && "bg-red-500",
        )}
      >
        <span
          className={cn(
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

      <div className="flex-1 w-full space-y-1">
        {visibleItems.map((item) =>
          item.type === "event"
            ? <TabContentCalendarDayEvents key={item.id} eventId={item.id} />
            : <TabContentCalendarDaySessions key={item.id} sessionId={item.id} />
        )}

        {hiddenCount > 0 && (
          <TabContentCalendarDayMore
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

function TabContentCalendarDayEvents({ eventId }: { eventId: string }) {
  const event = persisted.UI.useRow("events", eventId, persisted.STORE_ID);
  const [open, setOpen] = useState(false);
  const { openNew } = useTabs();

  const sessionIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionsByEvent,
    eventId,
    persisted.STORE_ID,
  );
  const linkedSessionId = sessionIds[0];
  const linkedSession = persisted.UI.useRow("sessions", linkedSessionId || "dummy", persisted.STORE_ID);

  const handleClick = () => {
    setOpen(false);

    if (linkedSessionId) {
      openNew({ type: "sessions", id: linkedSessionId, state: { editor: "raw" } });
    } else {
      openNew({ type: "sessions", id: crypto.randomUUID(), state: { editor: "raw" } });
    }
  };

  const formatEventTime = () => {
    if (!event.started_at || !event.ended_at) {
      return "";
    }
    const start = new Date(event.started_at);
    const end = new Date(event.ended_at);

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
        <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          <Calendar size={12} className="text-neutral-500 flex-shrink-0" />
          <div className="flex-1 text-xs text-neutral-800 truncate">
            {event.title}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <div className="font-semibold text-lg text-neutral-800 mb-2">
          {event.title || "Untitled Event"}
        </div>

        <p className="text-sm text-neutral-600 mb-4">
          {formatEventTime()}
        </p>

        {linkedSessionId
          ? (
            <div
              className="flex items-center gap-2 px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
              onClick={handleClick}
            >
              <FileText size={12} className="text-neutral-600 flex-shrink-0" />
              <div className="text-xs font-medium text-neutral-800 truncate">
                {linkedSession?.title || "Untitled Note"}
              </div>
            </div>
          )
          : (
            <div
              className="flex items-center gap-2 px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
              onClick={handleClick}
            >
              <Pen className="size-3 text-neutral-600 flex-shrink-0" />
              <div className="text-xs font-medium text-neutral-800 truncate">
                Create Note
              </div>
            </div>
          )}
      </PopoverContent>
    </Popover>
  );
}

function TabContentCalendarDaySessions({ sessionId }: { sessionId: string }) {
  const session = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const [open, setOpen] = useState(false);
  const { openNew } = useTabs();

  const event = persisted.UI.useRow("events", session.event_id || "dummy", persisted.STORE_ID);

  const handleClick = () => {
    setOpen(false);
    openNew({ type: "sessions", id: sessionId, state: { editor: "raw" } });
  };

  const formatSessionTime = () => {
    if (!session.created_at) {
      return "Created: —";
    }
    const created = new Date(session.created_at);
    if (isNaN(created.getTime())) {
      return "Created: —";
    }
    return `Created: ${format(created, "MMM d, h:mm a")}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          <FileText size={12} className="text-neutral-500 flex-shrink-0" />
          <div className="flex-1 text-xs text-neutral-800 truncate">
            {event && session.event_id ? event.title : session.title || "Untitled"}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <h3 className="font-semibold text-lg mb-2">
          {event && session.event_id ? event.title : session.title || "Untitled"}
        </h3>

        <p className="text-sm mb-4 text-neutral-600">
          {formatSessionTime()}
        </p>

        <div
          className="flex items-center gap-2 px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
          onClick={handleClick}
        >
          <FileText size={12} className="text-neutral-600 flex-shrink-0" />
          <div className="text-xs font-medium text-neutral-800 truncate">
            {event && session.event_id ? event.title : session.title || "Untitled"}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TabContentCalendarDayMore({
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
        <div className="text-xs text-neutral-600 rounded py-0.5 cursor-pointer hover:bg-neutral-200 px-0.5 h-5">
          +{hiddenCount} more
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4 max-h-96 space-y-2 overflow-y-auto bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0"
        align="start"
      >
        <div className="text-lg font-semibold text-neutral-800 mb-2">
          {format(new Date(day), "MMMM d, yyyy")}
        </div>

        <div className="space-y-1">
          {eventIds.map((eventId) => <TabContentCalendarDayEvents key={eventId} eventId={eventId} />)}
          {sessionIds.map((sessionId) => <TabContentCalendarDaySessions key={sessionId} sessionId={sessionId} />)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
