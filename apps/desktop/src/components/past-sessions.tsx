import { useCallback } from "react";
import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";

import type { Session } from "@/types/db";
import clsx from "clsx";

interface PastSessionsProps {
  sessions: Session[];
  handleClickSession: (session: Session) => void;
}

export default function PastSessions({ sessions }: PastSessionsProps) {
  const navigate = useNavigate();
  const handleClickSession = useCallback(
    (id: Session["id"]) => {
      navigate({
        to: "/note/$id",
        params: { id: id.toString() },
      });
    },
    [navigate],
  );

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
      <h2 className="text-xl font-semibold">
        <Trans>Past Sessions</Trans>
      </h2>

      <ul className="flex flex-col gap-2">
        {Object.entries(groupedSessions).map(([date, sessions]) => (
          <li key={date}>
            <h3>{date}</h3>
            <ul>
              {sessions.map((session) => (
                <li
                  key={session.id}
                  onClick={() => handleClickSession(session.id)}
                  className={clsx(["rounded-lg border border-border p-2"])}
                >
                  <pre>{JSON.stringify(session, null, 2)}</pre>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
