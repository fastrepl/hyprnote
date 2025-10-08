import { Calendar } from "lucide-react";

interface CalendarItemProps {
  eventName: string;
  icon?: "calendar" | "file" | "file-text";
}

export const CalendarItem = ({ eventName, icon = "calendar" }: CalendarItemProps) => {
  const IconComponent = icon === "calendar" ? Calendar : icon === "file" ? Calendar : Calendar;

  return (
    <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
      <IconComponent className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
      <div className="flex-1 text-xs text-neutral-800 truncate">
        {eventName}
      </div>
    </div>
  );
};
