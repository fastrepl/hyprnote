import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { FileText } from "lucide-react";

import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { Card, CardContent } from "@hypr/ui/components/ui/card";

import type { PastNotesProps } from "./types";

export function PastNotes({ human }: PastNotesProps) {
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", "human", human.id],
    queryFn: async () => {
      const allSessions = await dbCommands.listSessions({
        user_id: human.id,
        limit: 10,
        type: "recentlyVisited",
      });

      const sessionsWithHuman = await Promise.all(
        allSessions.map(async (session) => {
          const participants = await dbCommands.sessionListParticipants(session.id);
          const hasHuman = participants.some((p) => p.id === human.id);
          return hasHuman ? session : null;
        }),
      );

      return sessionsWithHuman.filter((s): s is Session => s !== null);
    },
  });

  return (
    <div className="mt-12">
      <h2 className="mb-4 font-semibold text-zinc-800 flex items-center gap-2">
        <FileText className="size-5" />
        <span>Past Notes</span>
      </h2>
      {sessions.length > 0
        ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to="/app/note/$id"
                params={{ id: session.id }}
                className="block"
              >
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200 shadow-sm rounded-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-900">{session.title}</h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          {format(new Date(session.created_at), "MMMM do, yyyy")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
        : (
          <p className="text-zinc-500">
            <Trans>No past notes with this contact</Trans>
          </p>
        )}
    </div>
  );
}
