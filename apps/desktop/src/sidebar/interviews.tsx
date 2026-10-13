import { useCallback } from "react";

import { Button } from "@anlg/ui/components/ui/button";

import { useInterviewSessions } from "~/contacts/queries";
import { useTabs } from "~/store/zustand/tabs";

export function InterviewsNav() {
  const openCurrent = useTabs((state) => state.openCurrent);
  const sessions = useInterviewSessions();

  const openInterview = useCallback(
    (id: string) => openCurrent({ type: "sessions", id }),
    [openCurrent],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border flex items-center justify-between border-b px-3 py-3">
        <div className="text-foreground text-sm font-semibold">Interviews</div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openCurrent({ type: "contacts" })}
        >
          Candidates
        </Button>
      </div>
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className="hover:bg-accent/60 flex w-full flex-col gap-1 border-b px-3 py-3 text-left"
            onClick={() => openInterview(session.id)}
          >
            <span className="text-foreground line-clamp-2 text-sm font-medium">
              {session.title}
            </span>
            {session.candidateNames.length > 0 && (
              <span className="text-muted-foreground line-clamp-1 text-xs">
                {session.candidateNames.join(", ")}
              </span>
            )}
            <span className="text-muted-foreground text-xs">
              {formatInterviewDate(session.createdAt)}
            </span>
          </button>
        ))}
        {sessions.length === 0 && (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">
            No sessions with participants were found.
          </p>
        )}
      </div>
    </div>
  );
}

function formatInterviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
