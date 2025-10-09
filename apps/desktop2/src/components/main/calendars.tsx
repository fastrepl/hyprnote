import { clsx } from "clsx";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, startOfMonth } from "date-fns";
import { CalendarIcon, FileTextIcon } from "lucide-react";

import { CalendarStructure } from "@hypr/ui/components/block/calendar-structure";
import * as persisted from "../../store/tinybase/persisted";
import { type Tab, useTabs } from "../../store/zustand/tabs";
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
          {eventIds.map((eventId) => <TabContentCalendarDayEvents key={eventId} eventId={eventId} />)}
          {sessionIds.map((sessionId) => <TabContentCalendarDaySessions key={sessionId} sessionId={sessionId} />)}
        </div>
      </div>
    </div>
  );
}

function TabContentCalendarDayEvents({ eventId }: { eventId: string }) {
  const event = persisted.UI.useRow("events", eventId, persisted.STORE_ID);

  return (
    <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
      <CalendarIcon className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
      <div className="flex-1 text-xs text-neutral-800 truncate">
        {event.title}
      </div>
    </div>
  );
}

function TabContentCalendarDaySessions({ sessionId }: { sessionId: string }) {
  const session = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  return (
    <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
      <FileTextIcon className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
      <div className="flex-1 text-xs text-neutral-800 truncate">
        {session.title}
      </div>
    </div>
  );
}
