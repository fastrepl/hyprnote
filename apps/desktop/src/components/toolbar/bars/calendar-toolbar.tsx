import { Trans, useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { addMonths, subMonths } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";

interface CalendarToolbarProps {
  date: Date;
}

export function CalendarToolbar({ date }: CalendarToolbarProps) {
  const { i18n } = useLingui();
  const navigate = useNavigate();
  const today = new Date();

  const handlePreviousMonth = () => {
    const prevMonth = subMonths(date, 1);
    navigate({
      to: "/app/finder",
      search: { view: "calendar", date: prevMonth.toISOString() },
      replace: true,
    });
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(date, 1);
    navigate({
      to: "/app/finder",
      search: { view: "calendar", date: nextMonth.toISOString() },
      replace: true,
    });
  };

  const handleToday = () => {
    navigate({
      to: "/app/finder",
      search: { view: "calendar", date: today.toISOString() },
      replace: true,
    });
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <header className="flex w-full flex-col">
      <div data-tauri-drag-region className="relative h-11 w-full flex items-center justify-center">
        <h1 className="text-xl font-bold" data-tauri-drag-region>
          {i18n.date(date, { month: "long", year: "numeric" })}
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
            className={clsx(
              "text-center font-light text-sm pb-2 pt-1",
              index === weekDays.length - 1 && "border-r-0",
            )}
          >
            {day}
          </div>
        ))}
      </div>
    </header>
  );
}
