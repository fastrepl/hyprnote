import { useQuery } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { Button } from "@hypr/ui/components/ui/button";
import { useSession } from "@/contexts";

import { commands as dbCommands } from "@hypr/plugin-db";

export function EventChip() {
  const session = useSession((s) => s.session);

  const event = useQuery({
    enabled: !!session?.id,
    queryKey: ["event", session.id],
    queryFn: () => dbCommands.sessionGetEvent(session.id),
  });

  return (
    <Popover>
      <PopoverTrigger disabled={!event.data}>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100">
          <CalendarIcon size={14} className="dark:text-neutral-100" />
          <p className="text-xs dark:text-neutral-100">
            {event.data?.start_date} - {event.data?.end_date}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="shadow-lg">
        <div className="flex flex-col gap-2">
          <div className="font-semibold dark:text-neutral-100">
            {event.data?.name}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            {event.data?.note}
          </div>
          <Button
            variant="outline"
            className="dark:text-neutral-100 dark:bg-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
          >
            View in calendar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
