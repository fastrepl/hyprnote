import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { MeetingDate } from "./date";
import { MeetingLink } from "./link";
import { Participants } from "./participants";
import { useMeetingMetadata } from "./shared";

export function SessionMetadata({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const meta = useMeetingMetadata(sessionId);

  if (!meta) {
    return (
      <Button disabled size="sm" variant="ghost">
        <CalendarIcon size={14} className="shrink-0" />
        <span>No event</span>
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          className="max-w-28 text-neutral-700"
          size="sm"
          variant="ghost"
          title={meta.title}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CalendarIcon size={14} className="shrink-0" />
          <p className="truncate">{meta.title}</p>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="shadow-lg w-[340px] relative p-0 max-h-[80vh] flex flex-col">
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          <div className="font-semibold text-base">{meta.title}</div>
          <Divider />
          <MeetingLink sessionId={sessionId} />
          <Divider />
          <MeetingDate sessionId={sessionId} />
          <Divider />
          <Participants sessionId={sessionId} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Divider() {
  return <div className="border-t border-neutral-200" />;
}
