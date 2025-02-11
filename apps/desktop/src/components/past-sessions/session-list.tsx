import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Session, Participant } from "@/types";
import { commands } from "@/types";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { format, isThisYear } from "date-fns";

interface SessionListProps {
  data: Session[];
}

function ParticipantList({ eventId }: { eventId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (eventId) {
      commands
        .listParticipants({ Event: eventId })
        .then(setParticipants)
        .catch(console.error);
    }
  }, [eventId]);

  if (!eventId) return <span>-</span>;
  if (participants.length === 0) return <span>Loading...</span>;

  return (
    <div className="flex items-center gap-2">
      {participants.slice(0, 3).map((participant) => (
        <div
          key={participant.id}
          className="inline-flex items-center gap-1 rounded-full border bg-neutral-100 px-1.5 py-1 text-xs font-medium"
        >
          <Avatar className="h-5 w-5">
            <AvatarFallback className="bg-neutral-200 font-semibold">
              {participant.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {participant.name}
        </div>
      ))}
      {participants.length > 3 && (
        <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
          +{participants.length - 3} more
        </div>
      )}
    </div>
  );
}

export default function SessionList({ data }: SessionListProps) {
  const navigate = useNavigate();

  const handleClickSession = useCallback(
    (session: Session) => {
      navigate({
        to: "/note/$id",
        params: {
          id: session.id,
        },
      });
    },
    [navigate],
  );

  return (
    <div className="flex flex-col gap-4">
      {data.map((session) => {
        const timestamp = parseFloat(session.timestamp);
        const date = new Date(timestamp);
        const formattedDate = isThisYear(date)
          ? format(date, "MMM d (EEE), h:mm a")
          : format(date, "MMM d (EEE), h:mm a, yyyy");

        return (
          <div
            key={session.id}
            onClick={() => handleClickSession(session)}
            className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-4 hover:bg-neutral-50"
          >
            <div className="text-lg font-medium">{session.title}</div>
            <div className="text-sm text-muted-foreground">{formattedDate}</div>
            {session.calendar_event_id && (
              <ParticipantList eventId={session.calendar_event_id} />
            )}
          </div>
        );
      })}
    </div>
  );
}
