import { useSession } from "@/contexts";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

export function EventChip() {
  const sessionId = useSession((s) => s.session?.id);

  const event = useQuery({
    enabled: !!sessionId,
    queryKey: ["event", sessionId!],
    queryFn: () => dbCommands.sessionGetEvent(sessionId!),
  });

  return (
    <Popover>
      <PopoverTrigger disabled={!event.data}>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100">
          <CalendarIcon size={14} />
          <p className="text-xs">
            {event.data?.start_date} - {event.data?.end_date}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="font-semibold">{event.data?.name}</div>
          <div className="text-sm text-neutral-600">{event.data?.note}</div>
          <Button variant="outline">
            View in calendar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
