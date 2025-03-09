import { format } from "date-fns";
import { Pen } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { commands as dbCommands, type Event } from "@hypr/plugin-db";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Button } from "@hypr/ui/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export function EventCard({ event }: { event: Event }) {
  const navigate = useNavigate();

  const session = useQuery({
    queryKey: ["event-session", event.id],
    queryFn: async () => dbCommands.getSession({ calendarEventId: event.id }),
  });

  const handleClick = () => {
    if (!session.data) {
      navigate({
        to: "/app",
        search: { eventId: event.id.toString() },
      });
    } else {
      navigate({
        to: "/app/note/$id",
        params: { id: session.data!.id },
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="text-xs p-1 bg-blue-100 rounded cursor-pointer truncate hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-neutral-300">
          {event.name}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 dark:text-neutral-300 dark:bg-neutral-950">
        <p className="text-sm mb-2 dark:text-neutral-300">
          {format(new Date(event.start_date), "MMM d, h:mm a")}
          {" - "}
          {format(new Date(event.start_date), "yyyy-MM-dd") !==
          format(new Date(event.end_date), "yyyy-MM-dd")
            ? format(new Date(event.end_date), "MMM d, h:mm a")
            : format(new Date(event.end_date), "h:mm a")}
        </p>

        <div className="font-semibold text-lg mb-1 dark:text-neutral-300">
          {event.name}
        </div>

        <p className="text-sm text-muted-foreground mb-4 dark:text-neutral-300">
          {event.note}
        </p>

        <Button
          className="w-full dark:bg-neutral-600 dark:hover:bg-neutral-700 dark:text-neutral-300"
          size="md"
          onClick={handleClick}
        >
          <Pen className="mr-2 size-4" />
          Prepare Meeting Note
        </Button>
      </PopoverContent>
    </Popover>
  );
}
