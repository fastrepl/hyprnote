import { useQuery } from "@tanstack/react-query";
import type { LinkProps } from "@tanstack/react-router";
import { format } from "date-fns";
import { File, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { useHypr } from "@/contexts";
import type { Session } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
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

  // Fetch linked event if this session is connected to a calendar event
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

    const props = {
      to: "/app/note/$id",
      params: { id },
    } as const satisfies LinkProps;

    const url = props.to.replace("$id", props.params.id);

    safeNavigate({ type: "main" }, url);
  };

  const getStartDate = () => {
    // If recorded, use record_start; otherwise use created_at
    if (session.record_start) {
      return new Date(session.record_start);
    }
    return new Date(session.created_at);
  };

  const getEndDate = () => {
    // Only return end date if this is a recorded session
    if (session.record_start && session.record_end) {
      return new Date(session.record_end);
    }
    // For unrecorded notes, return same as start (single point in time)
    return getStartDate();
  };

  const isRecordedSession = session.record_start && session.record_end;
  const shouldShowRange = isRecordedSession;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-start space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          {isRecordedSession
            ? <FileText className="w-2.5 h-2.5 mt-0.5 text-neutral-500 flex-shrink-0" />
            : <File className="w-2.5 h-2.5 mt-0.5 text-neutral-500 flex-shrink-0" />}

          <div className="flex-1 text-xs text-neutral-800 truncate">
            {linkedEvent.data?.name || session.title || "Untitled"}
          </div>

          {showTime && (
            <div className="text-xs text-neutral-500">
              {shouldShowRange
                ? `${format(getStartDate(), "h:mm a")} - ${format(getEndDate(), "h:mm a")}`
                : format(getStartDate(), "h:mm a")}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <div className="font-semibold text-lg mb-2 text-neutral-800 flex items-center gap-2">
          {isRecordedSession
            ? <FileText className="w-5 h-5 text-neutral-600" />
            : <File className="w-5 h-5 text-neutral-600" />}
          {linkedEvent.data?.name || session.title || "Untitled"}
        </div>

        <p className="text-sm mb-2 text-neutral-600">
          {shouldShowRange
            ? (
              // Recorded session: show record range
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
              // Unrecorded note: show just creation time
              <>
                Created: {format(getStartDate(), "MMM d, h:mm a")}
              </>
            )}
        </p>

        {participantsPreview && participantsPreview.length > 0 && (
          <div className="text-xs text-neutral-600 mb-4 truncate">
            {participantsPreview.join(", ")}
          </div>
        )}

        <div
          className="flex items-center gap-2 p-2 bg-neutral-50 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
          onClick={() => handleClick(session.id)}
        >
          {isRecordedSession
            ? <FileText className="w-4 h-4 text-neutral-600" />
            : <File className="w-4 h-4 text-neutral-600" />}
          <div className="flex-1">
            <div className="text-sm font-medium text-neutral-800">
              {linkedEvent.data?.name || session.title || "Untitled"}
            </div>
            <div className="text-xs text-neutral-500">
              {isRecordedSession ? "Recorded note" : "Note"} · Click to open
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
