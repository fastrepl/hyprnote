import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";

import { useHypr } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/ui/lib/utils";
import { useSession } from "@hypr/utils/contexts";
import { formatRelativeWithDay } from "@hypr/utils/datetime";

interface EventChipProps {
  sessionId: string;
}

export function EventChip({ sessionId }: EventChipProps) {
  const { onboardingSessionId } = useHypr();

  const { sessionCreatedAt } = useSession(sessionId, (s) => ({
    sessionCreatedAt: s.session.created_at,
  }));

  const event = useQuery({
    queryKey: ["event", sessionId],
    queryFn: () => dbCommands.sessionGetEvent(sessionId),
  });

  const date = event.data?.start_date ?? sessionCreatedAt;

  return (
    <Popover>
      <PopoverTrigger disabled={!event.data || onboardingSessionId === sessionId}>
        <div
          className={cn(
            "flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800",
            !event.data && "opacity-50 cursor-not-allowed",
            onboardingSessionId === sessionId && "opacity-50 cursor-not-allowed",
          )}
        >
          <CalendarIcon size={14} />
          <p className="text-xs">{formatRelativeWithDay(date)}</p>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="shadow-lg w-72">
        <div className="flex flex-col gap-2">
          <div className="font-semibold">{event.data?.name}</div>
          <div className="text-sm text-neutral-600">{event.data?.note}</div>
          <Button variant="outline">
            <Trans>View in calendar</Trans>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
