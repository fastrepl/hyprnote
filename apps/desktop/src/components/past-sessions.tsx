import { Session } from "@/types/db";
import { Trans } from "@lingui/react/macro";

interface PastSessionsProps {
  sessions: Session[];
  handleClickSession: (session: Session) => void;
}

export default function PastSessions({ sessions }: PastSessionsProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold">
        <Trans>Past Sessions</Trans>
      </h2>
      {sessions.map((session) => (
        <div key={session.id}>
          <pre>{JSON.stringify(session, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
