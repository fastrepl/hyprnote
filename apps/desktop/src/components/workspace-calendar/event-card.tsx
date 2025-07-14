import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import type { LinkProps } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, FileText, Pen } from "lucide-react";
import { useMemo, useState } from "react";

import { useHypr } from "@/contexts";
import { openURL } from "@/utils/shell";
import type { Event } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
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
          <Calendar className="w-2.5 h-2.5 mt-0.5 text-neutral-500 flex-shrink-0" />

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
        <div
          className="font-semibold text-lg text-neutral-800 flex items-center gap-2 mb-2 cursor-pointer hover:text-neutral-600 transition-colors"
          onClick={async () => {
            if (event.google_event_url) {
              try {
                await openURL(event.google_event_url as string);
              } catch (error) {
                console.error("Failed to open event URL:", error);
              }
            }
          }}
        >
          <Calendar className="w-5 h-5 text-neutral-600" />
          {event.name || "Untitled Event"}
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
            <div
              className="flex items-center gap-2 p-2 bg-neutral-50 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
              onClick={handleClick}
            >
              <FileText className="w-4 h-4 text-neutral-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-800">
                  {session.data.title || "Untitled Note"}
                </div>
                <div className="text-xs text-neutral-500">Click to open note</div>
              </div>
            </div>
          )
          : (
            <div
              className="flex items-center gap-2 p-2 bg-neutral-50 border border-dashed border-neutral-300 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
              onClick={handleClick}
            >
              <Pen className="w-4 h-4 text-neutral-400" />
              <div className="flex-1">
                <div className="text-sm text-neutral-600">
                  {session.isLoading ? <Trans>Loading...</Trans> : <Trans>Create Note</Trans>}
                </div>
                <div className="text-xs text-neutral-400">Click to add a note</div>
              </div>
            </div>
          )}
      </PopoverContent>
    </Popover>
  );
}
