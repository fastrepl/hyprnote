import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { FileText } from "lucide-react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";

import type { RecentNotesProps } from "./types";

export function RecentNotes({ organizationId, members }: RecentNotesProps) {
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", "organization", organizationId],
    queryFn: async () => {
      const memberSessions = await Promise.all(
        members.map(async (member) => {
          const sessions = await dbCommands.listSessions({
            user_id: member.id,
            limit: 5,
            type: "recentlyVisited",
          });
          return sessions;
        }),
      );

      const allSessions = memberSessions.flat();
      const uniqueSessions = Array.from(
        new Map(allSessions.map((session) => [session.id, session])).values(),
      );

      return uniqueSessions.slice(0, 10);
    },
    enabled: members.length > 0,
  });

  return (
    <div className="mt-8">
      <h2 className="mb-4 flex items-center justify-center gap-2 font-semibold">
        <FileText className="size-5" />
        <Trans>Recent Notes</Trans>
      </h2>
      {sessions.length > 0
        ? (
          <div className="space-y-4 max-w-xs mx-auto">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{session.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.created_at), "PPP")}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <Link to="/app/note/$id" params={{ id: session.id }}>
                        <Trans>View Note</Trans>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
        : (
          <p className="text-muted-foreground text-center">
            <Trans>No recent notes for this organization</Trans>
          </p>
        )}
    </div>
  );
}
