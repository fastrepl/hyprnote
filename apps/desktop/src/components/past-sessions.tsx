import { useCallback, useEffect, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format, isThisYear } from "date-fns";

import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { commands, type Session, type Human } from "@/types";

export default function PastSessions() {
  const data = useQuery({
    queryKey: ["sessions"],
    queryFn: () => commands.listSessions(null),
  });

  return (
    <div className="pb-24">
      <h2 className="mb-4 text-lg font-semibold">
        <Trans>Past Notes</Trans>
      </h2>

      <SessionList data={data.data ?? []} />
    </div>
  );
}

function SessionList({ data }: { data: Session[] }) {
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

function ParticipantList({ eventId }: { eventId: string }) {
  const [participants, setParticipants] = useState<Human[]>([]);

  useEffect(() => {
    if (eventId) {
      commands
        .listParticipants(eventId)
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
              {participant.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {participant.full_name}
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
