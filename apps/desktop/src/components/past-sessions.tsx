import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { CalendarIcon, ClockIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hypr/ui/components/ui/card";
import { Badge } from "@hypr/ui/components/ui/badge";

import type { Session } from "@/types/db";

interface PastSessionsProps {
  sessions: Session[];
  handleClickSession: (session: Session) => void;
}

export default function PastSessions({ sessions }: PastSessionsProps) {
  // TODO: we should use event's start end data instead, it it has one.
  const groupedSessions = sessions
    .sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    })
    .reduce(
      (groups, session) => {
        const date = new Date(session.timestamp).toLocaleDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(session);
        return groups;
      },
      {} as Record<string, Session[]>,
    );

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-semibold">
        <Trans>Past Sessions</Trans>
      </h2>

      <ul className="flex flex-col gap-4">
        {Object.entries(groupedSessions).map(([date, sessions]) => (
          <li key={date}>
            <h3 className="my-2 text-lg font-semibold">{date}</h3>
            <ul className="flex flex-col gap-2">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link to="/note/$id" params={{ id: session.id.toString() }}>
                    <SessionCard session={session} />
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const date = new Date(session.timestamp);
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString();

  return (
    <Card className="cursor-pointer transition-colors hover:bg-accent">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{session.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center space-x-2 text-sm text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>{formattedDate}</span>
          <ClockIcon className="ml-2 h-4 w-4" />
          <span>{formattedTime}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(JSON.parse(session.tags as unknown as string) as string[]).map(
            (tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ),
          )}
        </div>
        {session.transcript && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {JSON.parse(session.transcript as unknown as string).blocks[0]
              ?.text || "No transcript available"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
