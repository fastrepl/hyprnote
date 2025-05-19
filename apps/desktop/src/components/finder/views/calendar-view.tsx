import { Trans, useLingui } from "@lingui/react/macro";
import { addMonths, subMonths } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import WorkspaceCalendar from "@/components/workspace-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";

interface CalendarViewProps {
  date: Date;
  sessions: any[];
  events: any[];
  onNavigate: (params: { date: string }) => void;
}

export function CalendarView({ date, sessions, events, onNavigate }: CalendarViewProps) {
  const { i18n } = useLingui();
  const [currentDate, setCurrentDate] = useState(date);

  // Calendar toolbar component embedded directly to handle navigation
  const handlePreviousMonth = () => {
    const prevMonth = subMonths(currentDate, 1);
    setCurrentDate(prevMonth);
    onNavigate({ date: prevMonth.toISOString() });
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentDate, 1);
    setCurrentDate(nextMonth);
    onNavigate({ date: nextMonth.toISOString() });
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onNavigate({ date: today.toISOString() });
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col h-full">
      <header className="flex w-full flex-col">
        <div data-tauri-drag-region className="relative h-11 w-full flex items-center justify-center">
          <h1 className="text-xl font-bold" data-tauri-drag-region>
            {i18n.date(currentDate, { month: "long", year: "numeric" })}
          </h1>

          <div className="absolute right-2 flex h-fit rounded-md overflow-clip border border-neutral-200">
            <Button
              variant="outline"
              className="p-0.5 rounded-none border-none"
              onClick={handlePreviousMonth}
            >
              <ChevronLeftIcon size={16} />
            </Button>

            <Button
              variant="outline"
              className="text-sm px-1 py-0.5 rounded-none border-none"
              onClick={handleToday}
            >
              <Trans>Today</Trans>
            </Button>

            <Button
              variant="outline"
              className="p-0.5 rounded-none border-none"
              onClick={handleNextMonth}
            >
              <ChevronRightIcon size={16} />
            </Button>
          </div>
        </div>

        <div className="border-b border-neutral-200 grid grid-cols-7 h-8">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={cn(
                "text-center font-light text-sm pb-2 pt-1",
                index === weekDays.length - 1 && "border-r-0",
              )}
            >
              {day}
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <WorkspaceCalendar
          month={currentDate}
          sessions={sessions}
          events={events}
        />
      </div>
    </div>
  );
}
