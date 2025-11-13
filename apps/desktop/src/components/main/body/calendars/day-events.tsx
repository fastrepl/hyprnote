import { Calendar, Pen, StickyNote } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { cn, format, isSameDay } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";
import { useTabs } from "../../../../store/zustand/tabs";

export function TabContentCalendarDayEvents({ eventId }: { eventId: string }) {
  const event = main.UI.useRow("events", eventId, main.STORE_ID);
  const [open, setOpen] = useState(false);
  const openNew = useTabs((state) => state.openNew);

  const title = event?.title || "Untitled Event";

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByEvent,
    eventId,
    main.STORE_ID,
  );
  const linkedSessionId = sessionIds[0];
  const linkedSession = main.UI.useRow(
    "sessions",
    linkedSessionId || "dummy",
    main.STORE_ID,
  );

  const handleOpenNote = () => {
    setOpen(false);

    if (linkedSessionId) {
      openNew({ type: "sessions", id: linkedSessionId });
    } else {
      openNew({ type: "sessions", id: crypto.randomUUID() });
    }
  };

  const formatEventTime = () => {
    if (!event || !event.started_at || !event.ended_at) {
      return "";
    }
    const start = new Date(event.started_at);
    const end = new Date(event.ended_at);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "";
    }

    if (isSameDay(start, end)) {
      return `${format(start, "MMM d")}, ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
    }
    return `${format(start, "MMM d")}, ${format(start, "h:mm a")} - ${format(end, "MMM d")}, ${format(end, "h:mm a")}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn([
            "w-full justify-start px-1 text-neutral-600 h-6",
            open && "bg-neutral-100 hover:bg-neutral-100",
          ])}
        >
          <Calendar size={12} className="text-pink-600" />
          <p className="truncate">{title}</p>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <div className="font-semibold text-lg text-neutral-800 mb-2">
          {title}
        </div>

        <p className="text-sm text-neutral-600 mb-4">{formatEventTime()}</p>

        {linkedSessionId ? (
          <Button className="w-full justify-start" onClick={handleOpenNote}>
            <StickyNote />
            <p className="truncate">
              {linkedSession?.title || "Untitled Note"}
            </p>
          </Button>
        ) : (
          <Button className="w-full" onClick={handleOpenNote}>
            <Pen />
            Create Note
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
