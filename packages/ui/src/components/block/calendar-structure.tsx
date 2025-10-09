import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "../ui/button";

interface CalendarStructureProps {
  monthLabel: string;
  weekDays: string[];
  startDayOfWeek: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  children: React.ReactNode;
}

export const CalendarStructure = ({
  monthLabel,
  weekDays,
  startDayOfWeek,
  onPreviousMonth,
  onNextMonth,
  onToday,
  children,
}: CalendarStructureProps) => {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-4 flex items-center relative">
        <div className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">{monthLabel}</div>
        <div className="flex h-fit rounded-md overflow-clip border border-neutral-200 ml-auto">
          <Button
            variant="outline"
            className="p-0.5 rounded-none border-none"
            onClick={onPreviousMonth}
          >
            <ChevronLeftIcon size={16} />
          </Button>

          <Button
            variant="outline"
            className="text-sm px-1 py-0.5 rounded-none border-none"
            onClick={onToday}
          >
            Today
          </Button>

          <Button
            variant="outline"
            className="p-0.5 rounded-none border-none"
            onClick={onNextMonth}
          >
            <ChevronRightIcon size={16} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 divide-x divide-neutral-200">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground p-2"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-neutral-200 h-full grid-rows-6 gap-0">
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="border-b border-neutral-200" />
        ))}
        {children}
      </div>
    </div>
  );
};
