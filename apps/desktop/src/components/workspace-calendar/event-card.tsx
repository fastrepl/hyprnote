import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import type { LinkProps } from "@tanstack/react-router";
import { format } from "date-fns";
import { ExternalLinkIcon, Pen } from "lucide-react";
import { useMemo, useState } from "react";

import { useHypr } from "@/contexts";
import type { Event } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { safeNavigate } from "@hypr/utils/navigation";

export function EventCard({
  event,
  showTime = false,
}: {
  event: Event;
  showTime?: boolean;
}) {
  const { userId } = useHypr();
  const session = useQuery({
    queryKey: ["event-session", event.id],
    queryFn: async () => dbCommands.getSession({ calendarEventId: event.id }),
  });

  const participants = useQuery({
    queryKey: ["participants", session.data?.id],
    queryFn: async () => {
      if (!session.data?.id) {
        return [];
      }
      const participants = await dbCommands.sessionListParticipants(session.data.id);
      return participants.sort((a, b) => {
        if (a.is_user && !b.is_user) {
          return 1;
        }
        if (!a.is_user && b.is_user) {
          return -1;
        }
        return 0;
      });
    },
    enabled: !!session.data?.id,
  });

  const participantsPreview = useMemo(() => {
    const count = participants.data?.length ?? 0;
    if (count === 0) {
      return null;
    }

    return participants.data?.map(participant => {
      if (participant.id === userId && !participant.full_name) {
        return "You";
      }
      return participant.full_name ?? "??";
    });
  }, [participants.data, userId]);

  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(false);

    if (session.data) {
      const props = {
        to: "/app/note/$id",
        params: { id: session.data.id },
      } as const satisfies LinkProps;

      const url = props.to.replace("$id", props.params.id);

      safeNavigate({ type: "main" }, url);
    } else {
      const props = {
        to: "/app/new",
        search: { calendarEventId: event.id },
      } as const satisfies LinkProps;

      const url = props.to.concat(
        `?calendarEventId=${props.search.calendarEventId}`,
      );

      safeNavigate({ type: "main" }, url);
    }
  };

  const getStartDate = () => {
    return new Date(event.start_date);
  };

  const getEndDate = () => {
    return new Date(event.end_date);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-start space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          <div className="w-1 h-3 mt-0.5 rounded-full flex-shrink-0 bg-neutral-400"></div>

          <div className="flex-1 text-xs text-neutral-800 truncate">
            {event.name || "Untitled Event"}
          </div>

          {showTime && (
            <div className="text-xs text-neutral-500">
              {format(getStartDate(), "h:mm a")} - {format(getEndDate(), "h:mm a")}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <div className="flex mb-2 items-center justify-between">
          <div className="font-semibold text-lg text-neutral-800">
            {event.name || "Untitled Event"}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(event.google_event_url as string, "_blank")}
          >
            <ExternalLinkIcon size={14} />
          </Button>
        </div>

        <p className="text-sm text-neutral-600 mb-2">
          {format(getStartDate(), "MMM d, h:mm a")}
          {" - "}
          {format(getStartDate(), "yyyy-MM-dd")
              !== format(getEndDate(), "yyyy-MM-dd")
            ? format(getEndDate(), "MMM d, h:mm a")
            : format(getEndDate(), "h:mm a")}
        </p>

        {participantsPreview && participantsPreview.length > 0 && (
          <div className="text-xs text-neutral-600 mb-4 truncate">
            {participantsPreview.join(", ")}
          </div>
        )}

        {session.data
          ? (
            <Button
              className="w-full inline-flex gap-2"
              size="md"
              onClick={handleClick}
            >
              <Pen className="size-4" />
              <Trans>Open Note</Trans>
            </Button>
          )
          : (
            <Button
              className="w-full inline-flex gap-2"
              size="md"
              disabled={session.isLoading}
              onClick={handleClick}
            >
              {session.isLoading ? <Trans>Loading...</Trans> : (
                <>
                  <Pen className="size-4" />
                  <Trans>Create Note</Trans>
                </>
              )}
            </Button>
          )}
      </PopoverContent>
    </Popover>
  );
}
