import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { CalendarIcon } from "lucide-react";

export default function EventChip() {
  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100">
          <CalendarIcon size={14} />
          <span className="text-xs">Jan 23</span>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="font-semibold">예은 X 지헌</div>
          <div className="text-sm text-neutral-600">
            Thu, Jan 23 8:00 PM - 9:00 PM
          </div>
          <button className="mt-2 rounded-md border border-border px-2 py-1 hover:bg-neutral-100">
            View in calendar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
