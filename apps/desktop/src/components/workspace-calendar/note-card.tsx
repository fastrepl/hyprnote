import { useQuery } from "@tanstack/react-query";
import type { LinkProps } from "@tanstack/react-router";
import { format } from "date-fns";
import { File, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { useHypr } from "@/contexts";
import type { Session } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

export function NoteCard({
  session,
  showTime = false,
}: {
  session: Session;
  showTime?: boolean;
}) {
  const { userId } = useHypr();
  const [open, setOpen] = useState(false);

  const linkedEvent = useQuery({
    queryKey: ["session-linked-event", session.calendar_event_id],
    queryFn: async () => {
      if (!session.calendar_event_id) {
        return null;
      }
      return await dbCommands.getEvent(session.calendar_event_id);
    },
    enabled: !!session.calendar_event_id,
  });

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

  const handleClick = (id: string) => {
    setOpen(false);

    const url = { to: "/app/note/$id", params: { id } } as const satisfies LinkProps;
    windowsCommands.windowShow({ type: "main" }).then(() => {
      windowsCommands.windowEmitNavigate({ type: "main" }, {
        path: url.to.replace("$id", id),
        search: null,
      });
    });
  };

  const getStartDate = () => {
    if (session.record_start) {
      return new Date(session.record_start);
    }
    return new Date(session.created_at);
  };

  const getEndDate = () => {
    if (session.record_start && session.record_end) {
      return new Date(session.record_end);
    }
    return getStartDate();
  };

  const isRecordedSession = session.record_start && session.record_end;
  const shouldShowRange = isRecordedSession;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          {isRecordedSession
            ? <FileText className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
            : <File className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />}

          <div className="flex-1 text-xs text-neutral-800 truncate">
            {linkedEvent.data?.name || session.title || "Untitled"}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <h3 className="font-semibold text-lg mb-2">
          {linkedEvent.data?.name || session.title || "Untitled"}
        </h3>

        <p className="text-sm mb-2 text-neutral-600">
          {shouldShowRange
            ? (
              <>
                {format(getStartDate(), "MMM d, h:mm a")}
                {" - "}
                {format(getStartDate(), "yyyy-MM-dd")
                    !== format(getEndDate(), "yyyy-MM-dd")
                  ? format(getEndDate(), "MMM d, h:mm a")
                  : format(getEndDate(), "h:mm a")}
              </>
            )
            : (
              <>
                Created: {format(getStartDate(), "MMM d, h:mm a")}
              </>
            )}
        </p>

        {participantsPreview && participantsPreview.length > 0 && (
          <div className="text-xs text-neutral-600 mb-4">
            {participantsPreview.join(", ")}
          </div>
        )}

        <div
          className="flex items-center gap-2 px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
          onClick={() => handleClick(session.id)}
        >
          {isRecordedSession
            ? <FileText className="size-3 text-neutral-600 flex-shrink-0" />
            : <File className="size-3 text-neutral-600 flex-shrink-0" />}
          <div className="text-xs font-medium text-neutral-800 truncate">
            {linkedEvent.data?.name || session.title || "Untitled"}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
