import { clsx } from "clsx";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, startOfMonth } from "date-fns";
import { CalendarIcon, FileTextIcon, Pen } from "lucide-react";
import { useState } from "react";

import { CalendarStructure } from "@hypr/ui/components/block/calendar-structure";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import * as persisted from "../../../store/tinybase/persisted";
import { type Tab, useTabs } from "../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemCalendar: TabItem = ({ tab, handleClose, handleSelect }) => {
  return (
    <TabItemBase
      icon={<CalendarIcon className="w-4 h-4" />}
      title={"Calendar"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentCalendar({ tab }: { tab: Tab }) {
  if (tab.type !== "calendars") {
    return null;
  }

  const { openCurrent } = useTabs();
  const monthStart = startOfMonth(tab.month);
  const monthEnd = endOfMonth(tab.month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((day) => format(day, "yyyy-MM-dd"));
  const startDayOfWeek = getDay(monthStart);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    <CalendarStructure
      monthLabel={format(tab.month, "MMMM yyyy")}
      weekDays={weekDays}
      startDayOfWeek={startDayOfWeek}
      onPreviousMonth={handlePreviousMonth}
      onNextMonth={handleNextMonth}
      onToday={handleToday}
    >
      {days.map((day) => (
        <TabContentCalendarDay key={day} day={day} isCurrentMonth={isSameMonth(new Date(day), tab.month)} />
      ))}
    </CalendarStructure>
  );
}

function TabContentCalendarDay({ day, isCurrentMonth }: { day: string; isCurrentMonth: boolean }) {
  const eventIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.eventsByDate,
    day,
    persisted.STORE_ID,
  );

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

  return (
    <div
      className={clsx([
        "h-32 relative flex flex-col border-b border-neutral-200",
        isWeekend ? "bg-neutral-50" : "bg-white",
      ])}
    >
      <div className="flex items-center justify-end px-1 text-sm h-8">
        <div className={clsx("flex items-end gap-1", isToday && "items-center")}>
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

      <div className="flex-1 overflow-hidden flex flex-col px-1">
        <div className="space-y-1">
          {visibleItems.map((item) =>
            item.type === "event"
              ? <TabContentCalendarDayEvents key={item.id} eventId={item.id} />
              : <TabContentCalendarDaySessions key={item.id} sessionId={item.id} />
          )}

          {hiddenCount > 0 && (
            <TabContentCalendarDayMore
              day={day}
              eventIds={eventIds}
              sessionIds={sessionIds}
              hiddenCount={hiddenCount}
            />
          )}
        </div>
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
  const linkedSessionId = sessionIds[0]; // take the first linked session if any
  const linkedSession = persisted.UI.useRow("sessions", linkedSessionId || "dummy", persisted.STORE_ID);

  const handleClick = () => {
    setOpen(false);

    if (linkedSessionId) {
      openNew({ type: "sessions", id: linkedSessionId, active: false, state: { editor: "raw" } });
    } else {
      openNew({ type: "sessions", id: crypto.randomUUID(), active: false, state: { editor: "raw" } });
    }
  };

  const formatEventTime = () => {
    if (!event.started_at || !event.ended_at) {
      return "";
    }
    const start = new Date(event.started_at);
    const end = new Date(event.ended_at);

    const formatTime = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    };

    const formatDate = (date: Date) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    };

    const isSameDay = start.toDateString() === end.toDateString();
    if (isSameDay) {
      return `${formatDate(start)}, ${formatTime(start)} - ${formatTime(end)}`;
    }
    return `${formatDate(start)}, ${formatTime(start)} - ${formatDate(end)}, ${formatTime(end)}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          <CalendarIcon className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
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
              <FileTextIcon className="size-3 text-neutral-600 flex-shrink-0" />
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
    openNew({ type: "sessions", id: sessionId, active: false, state: { editor: "raw" } });
  };

  const formatSessionTime = () => {
    const created = new Date(session.created_at || "");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const hours = created.getHours();
    const minutes = created.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `Created: ${months[created.getMonth()]} ${created.getDate()}, ${displayHours}:${
      minutes.toString().padStart(2, "0")
    } ${ampm}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          <FileTextIcon className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
          <div className="flex-1 text-xs text-neutral-800 truncate">
            {session.title}
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
          <FileTextIcon className="size-3 text-neutral-600 flex-shrink-0" />
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
