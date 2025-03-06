import { format } from "date-fns";
import { Pen } from "lucide-react";

import { type Event } from "@hypr/plugin-db";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Button } from "@hypr/ui/components/ui/button";

export function EventCard({ event }: { event: Event }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="text-xs p-1 bg-blue-100 rounded cursor-pointer truncate hover:bg-blue-200">
          {event.name}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <p className="text-sm mb-2">
          {format(new Date(event.start_date), "MMM d, h:mm a")}
          {" - "}
          {format(new Date(event.start_date), "yyyy-MM-dd") !==
          format(new Date(event.end_date), "yyyy-MM-dd")
            ? format(new Date(event.end_date), "MMM d, h:mm a")
            : format(new Date(event.end_date), "h:mm a")}
        </p>

        <div className="font-semibold text-lg mb-1">{event.name}</div>

        <p className="text-sm text-muted-foreground mb-4">{event.note}</p>

        <Button className="w-full" size="md">
          <Pen className="mr-2 size-4" />
          Prepare Meeting Note
        </Button>
      </PopoverContent>
    </Popover>
  );
}
