import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import type { LinkProps } from "@tanstack/react-router";
import { format } from "date-fns";
import { Pen } from "lucide-react";
import { useState, useMemo } from "react";

import { useHypr } from "@/contexts";
import { type Session } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { safeNavigate } from "@hypr/utils/navigation";

export function NoteCard({
  session,
  showTime = false,
}: {
  session: Session;
  showTime?: boolean;
}) {
  const { userId } = useHypr();
  const [open, setOpen] = useState(false);

  const participants = useQuery({
    queryKey: ["participants", session.id],
    queryFn: async () => {
      const participants = await dbCommands.sessionListParticipants(session.id);
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
  });

  const participantsPreview = useMemo(() => {
    const count = participants.data?.length ?? 0;
    if (count === 0) return null;

    return participants.data?.map(participant => {
      if (participant.id === userId && !participant.full_name) {
        return "You";
      }
      return participant.full_name ?? "??";
    });
  }, [participants.data, userId]);

  const handleClick = (id: string) => {
    setOpen(false);

    const props = {
      to: "/app/note/$id",
      params: { id },
    } as const satisfies LinkProps;

    const url = props.to.replace("$id", props.params.id);

    safeNavigate({ type: "main" }, url);
  };

  const getStartDate = () => {
    return session.calendar_event_id
      ? new Date(session.created_at)
      : new Date();
  };

  const getEndDate = () => {
    return session.calendar_event_id
      ? new Date(session.created_at)
      : new Date();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-start space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          <div className="w-1 h-3 mt-0.5 rounded-full flex-shrink-0 bg-neutral-600"></div>

          <div className="flex-1 text-xs text-neutral-800 truncate">
            {session.title || "Untitled"}
          </div>

          {showTime && (
            <div className="text-xs text-neutral-500">
              {format(getStartDate(), "h:mm a")} -{" "}
              {format(getEndDate(), "h:mm a")}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <div className="font-semibold text-lg mb-2 text-neutral-800">
          {session.title || "Untitled"}
        </div>

        <p className="text-sm mb-2 text-neutral-600">
          {format(getStartDate(), "MMM d, h:mm a")}
          {" - "}
          {format(getStartDate(), "yyyy-MM-dd") !==
          format(getEndDate(), "yyyy-MM-dd")
            ? format(getEndDate(), "MMM d, h:mm a")
            : format(getEndDate(), "h:mm a")}
        </p>

        {participantsPreview && participantsPreview.length > 0 && (
          <div className="text-xs text-neutral-600 mb-4 truncate">
            {participantsPreview.join(", ")}
          </div>
        )}

        <Button
          className="w-full inline-flex gap-2"
          size="md"
          onClick={() => handleClick(session.id)}
        >
          <Pen className="size-4" />
          <Trans>Open Note</Trans>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
