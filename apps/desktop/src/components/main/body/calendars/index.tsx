import { Button } from "@hypr/ui/components/ui/button";
import { ButtonGroup } from "@hypr/ui/components/ui/button-group";
import {
  addDays,
  addMonths,
  cn,
  eachDayOfInterval,
  format,
  getDay,
  isSameMonth,
  startOfMonth,
  subDays,
} from "@hypr/utils";

import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import * as main from "../../../../store/tinybase/main";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { CalendarCheckboxRow } from "./calendar-checkbox-row";
import { TabContentCalendarDay } from "./calendar-day";

export const TabItemCalendar: TabItem<Extract<Tab, { type: "calendars" }>> = (
  {
    tab,
    tabIndex,
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
      selected={tab.active}
      tabIndex={tabIndex}
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
  return <TabContentCalendarInner tab={tab} />;
}

function TabContentCalendarInner({ tab }: { tab: Extract<Tab, { type: "calendars" }> }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { openCurrent } = useTabs();

  const calendarIds = main.UI.useRowIds("calendars", main.STORE_ID);

  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(() => new Set(calendarIds));

  const monthStart = startOfMonth(tab.month);
  const startDayOfWeek = getDay(monthStart);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabel = format(tab.month, "MMMM yyyy");

  const calendarStart = subDays(monthStart, startDayOfWeek);
  const totalCells = 42;
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
            <div className="p-2 text-sm border-b border-neutral-200 flex items-center gap-2">
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
                  className="shadow-none"
                >
                  <ChevronLeft size={16} />
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
                  <ChevronRight size={16} />
                </Button>
              </ButtonGroup>
            </div>

            <div className="grid grid-cols-7 border-b border-neutral-200">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={cn(
                    [
                      "text-center text-sm font-medium p-2",
                      index === 0 || index === 6 ? "text-black/70" : "text-black",
                    ],
                  )}
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
