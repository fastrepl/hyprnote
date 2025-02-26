import { useCallback, useEffect, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  format,
  isThisYear,
  isToday,
  isYesterday,
  isThisWeek,
  differenceInCalendarDays,
  startOfToday,
} from "date-fns";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import {
  commands as dbCommands,
  type Human,
  type Session,
} from "@hypr/plugin-db";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@hypr/ui/components/ui/card";
import { Users2 } from "lucide-react";

export default function PastSessions() {
  console.log("past sessions");
  const data = useQuery({
    queryKey: ["sessions"],
    queryFn: () => dbCommands.listSessions(null),
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
        to: "/app/note/$id",
        params: {
          id: session.id,
        },
      });
    },
    [navigate],
  );

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) {
      return "Today";
    }

    if (isYesterday(date)) {
      return "Yesterday";
    }

    const daysDiff = differenceInCalendarDays(startOfToday(), date);

    // For dates within the last week (but not yesterday)
    if (daysDiff > 1 && daysDiff <= 7) {
      // If it's this week, just show the day name
      if (isThisWeek(date)) {
        return format(date, "EEEE");
      }
      // If it's last week, prefix with "Last"
      return `Last ${format(date, "EEEE")}`;
    }

    // For dates in the current year
    if (isThisYear(date)) {
      return format(date, "MMM d");
    }

    // For dates in different years
    return format(date, "MMM d, yyyy");
  };

  // Group sessions by date
  const groupedSessions = data.reduce(
    (groups, session) => {
      const timestamp = parseFloat(session.timestamp);
      const date = new Date(timestamp);
      const dateKey = format(date, "yyyy-MM-dd");

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date,
          sessions: [],
        };
      }

      groups[dateKey].sessions.push(session);
      return groups;
    },
    {} as Record<string, { date: Date; sessions: Session[] }>,
  );

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedSessions).sort((a, b) =>
    b.localeCompare(a),
  );

  return (
    <div className="flex flex-col gap-6">
      {sortedDates.map((dateKey) => {
        const { date, sessions } = groupedSessions[dateKey];
        const formattedDate = formatDateHeader(date);

        return (
          <div key={dateKey} className="space-y-4">
            <h3 className="text-base font-semibold text-neutral-600">
              {formattedDate}
            </h3>

            <div className="flex flex-col gap-4">
              {sessions.map((session) => {
                const timestamp = parseFloat(session.timestamp);
                const sessionDate = new Date(timestamp);
                const formattedTime = format(sessionDate, "h:mm a");

                return (
                  <Card
                    key={session.id}
                    variant="outline"
                    className="cursor-pointer transition-all hover:bg-neutral-50"
                    onClick={() => handleClickSession(session)}
                  >
                    <CardHeader>
                      <CardTitle
                        className="inline-flex items-center text-lg font-semibold"
                        as="h4"
                      >
                        <div className="mr-2 rounded-lg border bg-neutral-100 p-1">
                          {/* TODO: Need to change icon if calendar event has video call link attached */}
                          {/* <Laptop className="size-5 text-neutral-600" /> */}
                          <Users2 className="size-5 text-neutral-600" />
                        </div>
                        {session.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription>{formattedTime}</CardDescription>
                      {session.calendar_event_id && (
                        <ParticipantList eventId={session.calendar_event_id} />
                      )}
                      {/* TODO: Add tags */}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
      dbCommands
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
          <Avatar className="size-4">
            <AvatarFallback className="bg-neutral-200 text-xs font-semibold">
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
