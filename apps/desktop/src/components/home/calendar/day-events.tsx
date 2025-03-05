import { format } from "date-fns";
import { type Event } from "@hypr/plugin-db";
import { Pen } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Button } from "@hypr/ui/components/ui/button";
import { EventCard } from "./event-card";

interface DayEventsProps {
  date: Date;
  events: Event[];
}

export function DayEvents({ date, events }: DayEventsProps) {
  if (events.length === 0) return null;

  if (events.length <= 4) {
    return (
      <div className="space-y-1 mt-1">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-1">
      {events.slice(0, 3).map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <div className="text-xs p-1 bg-neutral-100 rounded cursor-pointer text-center hover:bg-neutral-200">
            +{events.length - 3} more
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 space-y-2">
          <div className="text-lg font-semibold">
            {format(date, "MMMM d, yyyy")}
          </div>

          {events.map((event) => (
            <Popover key={event.id}>
              <PopoverTrigger asChild>
                <div className="text-sm p-2 hover:bg-neutral-100 rounded cursor-pointer">
                  <div className="font-medium">{event.name}</div>
                  <div className="text-muted-foreground">
                    {event.note}
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" side="right">
                <p className="text-sm mb-2">
                  {format(new Date(event.start_date), "MMM d, h:mm a")}
                  {" - "}
                  {format(new Date(event.start_date), "yyyy-MM-dd") !== format(new Date(event.end_date), "yyyy-MM-dd")
                    ? format(new Date(event.end_date), "MMM d, h:mm a")
                    : format(new Date(event.end_date), "h:mm a")}
                </p>

                <div className="font-semibold text-lg mb-1">{event.name}</div>

                <p className="text-sm text-muted-foreground mb-4">
                  {event.note}
                </p>

                <Button className="w-full" size="md">
                  <Pen className="mr-2 size-4" />
                  Prepare Meeting Note
                </Button>
              </PopoverContent>
            </Popover>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
