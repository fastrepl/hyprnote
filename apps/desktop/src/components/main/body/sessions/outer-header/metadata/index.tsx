import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";

import { differenceInDays, format, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { forwardRef, useState } from "react";

import * as main from "../../../../../../store/tinybase/main";
import { DateDisplay } from "./date";
import { ParticipantsDisplay } from "./participants";

export function MetadataButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <TriggerInner sessionId={sessionId} open={open} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] shadow-lg p-0 max-h-[80vh] flex flex-col rounded-lg"
      >
        <ContentInner sessionId={sessionId} />
      </PopoverContent>
    </Popover>
  );
}

const TriggerInner = forwardRef<HTMLButtonElement, { sessionId: string; open?: boolean }>(
  ({ sessionId, open, ...props }, ref) => {
    const createdAt = main.UI.useCell("sessions", sessionId, "created_at", main.STORE_ID);

    return (
      <Button
        ref={ref}
        {...props}
        variant="ghost"
        size="sm"
        className={cn([open && "bg-neutral-100"])}
      >
        <CalendarIcon />
        {formatRelativeOrAbsolute(createdAt ? new Date(createdAt) : new Date())}
      </Button>
    );
  },
);

function ContentInner({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <DateDisplay sessionId={sessionId} />
      <ParticipantsDisplay sessionId={sessionId} />
    </div>
  );
}

function formatRelativeOrAbsolute(date: Date): string {
  const now = startOfDay(new Date());
  const targetDay = startOfDay(date);
  const daysDiff = differenceInDays(targetDay, now);
  const absDays = Math.abs(daysDiff);

  if (daysDiff === 0) {
    return "Today";
  }
  if (daysDiff === -1) {
    return "Yesterday";
  }
  if (daysDiff === 1) {
    return "Tomorrow";
  }

  if (daysDiff < 0 && absDays <= 6) {
    return `${absDays} days ago`;
  }

  if (daysDiff < 0 && absDays <= 27) {
    const weeks = Math.max(1, Math.round(absDays / 7));
    return weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
  }

  return format(date, "MMM d, yyyy");
}
