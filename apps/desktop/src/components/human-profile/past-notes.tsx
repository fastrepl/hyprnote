import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link, LinkProps, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { FileText } from "lucide-react";

import { commands as dbCommands, type Human, type Session } from "@hypr/plugin-db";
import { commands as windowsCommands, getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import { EmptyState, LoadingSkeleton, ProfileSectionHeader } from "./common";

export function PastNotes({ human }: { human: Human }) {
  const navigate = useNavigate();

  const { data: sessions = [], isLoading } = useQuery({
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

  const isEmpty = !isLoading && sessions.length === 0;

  const isMain = getCurrentWebviewWindowLabel() === "main";

  const handleCreateNote = () => {
    if (isMain) {
      navigate({ to: "/app/new" });
    } else {
      const params = { to: "/app/new" } as const satisfies LinkProps;

      windowsCommands.windowEmitNavigate({ type: "main" }, params.to).then(() => {
        windowsCommands.windowDestroy({ type: "human", value: human.id });
      });
    }
  };

  return (
    <div className="mt-12">
      <ProfileSectionHeader
        title="Past Notes"
        actionLabel="New Note"
        hideAction={isEmpty}
      />

      {isLoading ? <LoadingSkeleton count={3} /> : sessions.length > 0
        ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to="/app/note/$id"
                params={{ id: session.id }}
                className="block"
              >
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200 shadow-sm rounded-lg overflow-hidden">
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
          <EmptyState
            icon={<FileText className="h-14 w-14" />}
            title={<Trans>No past notes with this contact</Trans>}
            actionLabel={
              <Trans>
                <span onClick={handleCreateNote}>Create Note</span>
              </Trans>
            }
          />
        )}
    </div>
  );
}
