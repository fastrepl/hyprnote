import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";

import { MeetingDate } from "./date";
import { MeetingDescription } from "./description";
import { MeetingLink } from "./link";
import { MeetingLocation } from "./location";
import { MeetingParticipants } from "./participants";
import { useMeetingMetadata } from "./shared";

export function MeetingMetadata({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const meta = useMeetingMetadata(sessionId);

  // Keeping this at the top is important as we do `useMeetingMetadata(V)!` in other places
  if (!meta) {
    return (
      <Button disabled size="sm" variant="ghost" aria-label="No event" className="gap-1.5">
        <CalendarIcon size={14} className="shrink-0" />
        <span className="hidden md:inline">No event</span>
      </Button>
    );
  }

  const hasLocation = !!meta.location;
  const hasMeetingLink = !!meta.meeting_link;
  const hasDescription = !!meta.description;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          className="gap-1.5 text-neutral-700 md:max-w-28"
          size="sm"
          variant="ghost"
          title={meta.title}
          aria-label={meta.title}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CalendarIcon size={14} className="shrink-0" />
          <p className="hidden truncate md:block">{meta.title}</p>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className={cn([
          "flex flex-col",
          "shadow-lg w-[340px] relative p-0 max-h-[80vh]",
        ])}
      >
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          <div className="font-semibold text-base">{meta.title}</div>

          <div className="border-t border-neutral-200" />

          {hasLocation && (
            <>
              <MeetingLocation sessionId={sessionId} />
              <div className="border-t border-neutral-200" />
            </>
          )}

          {hasMeetingLink && (
            <>
              <MeetingLink sessionId={sessionId} />
              <div className="border-t border-neutral-200" />
            </>
          )}

          <MeetingDate sessionId={sessionId} />

          <div className="border-t border-neutral-200" />

          <MeetingParticipants sessionId={sessionId} />

          {hasDescription && (
            <>
              <div className="border-t border-neutral-200" />
              <MeetingDescription sessionId={sessionId} />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
