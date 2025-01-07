import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { CalendarIcon } from "lucide-react";

export default function SelectedEvent() {
  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md border border-border px-2 py-1">
          <CalendarIcon size={14} />
          <span className="text-xs">Selected Event</span>
        </div>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex flex-col gap-2">
          <span>123</span>
          <span>123</span>
          <span>123</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
