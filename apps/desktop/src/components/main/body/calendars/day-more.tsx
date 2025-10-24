import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { format } from "@hypr/utils";

import { useState } from "react";

import { TabContentCalendarDayEvents } from "./day-events";
import { TabContentCalendarDaySessions } from "./day-sessions";

export function TabContentCalendarDayMore({
  day,
  eventIds,
  sessionIds,
  hiddenCount,
}: {
  day: string;
  eventIds: string[];
  sessionIds: string[];
  hiddenCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="w-full justify-start px-1 text-neutral-600 h-6">
          +{hiddenCount} more
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4 max-h-96 space-y-2 overflow-y-auto bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0"
        align="start"
      >
        <div className="text-lg font-semibold text-neutral-800 mb-2">
          {format(new Date(day), "MMMM d, yyyy")}
        </div>

        <div className="space-y-1">
          {eventIds.map((eventId) => <TabContentCalendarDayEvents key={eventId} eventId={eventId} />)}
          {sessionIds.map((sessionId) => <TabContentCalendarDaySessions key={sessionId} sessionId={sessionId} />)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
