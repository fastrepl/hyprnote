import { useCallback } from "react";

import { Button } from "@anlg/ui/components/ui/button";

import { useInterviewSessions } from "~/contacts/queries";
import { StandardContentWrapper } from "~/shared/main";
import { useTabs } from "~/store/zustand/tabs";

export function TabContentInterviews() {
  const openCurrent = useTabs((state) => state.openCurrent);
  const sessions = useInterviewSessions();

  const openInterview = useCallback(
    (id: string) => openCurrent({ type: "sessions", id }),
    [openCurrent],
  );

  return (
    <StandardContentWrapper>
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-foreground text-2xl font-semibold">
              Interviews
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sessions linked to one or more participants.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => openCurrent({ type: "contacts" })}
          >
            View candidates
          </Button>
        </div>
        <div className="border-border divide-border overflow-hidden rounded-xl border">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className="hover:bg-accent/50 flex w-full flex-col gap-1 border-b px-4 py-4 text-left last:border-b-0"
              onClick={() => openInterview(session.id)}
            >
              <span className="text-foreground text-sm font-medium">
                {session.title}
              </span>
              <span className="text-muted-foreground text-xs">
                {session.candidateNames.length
                  ? session.candidateNames.join(", ")
                  : "Participant not named"}
                {" · "}
                {formatInterviewDate(session.createdAt)}
              </span>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="text-muted-foreground px-4 py-12 text-center text-sm">
              No sessions with participants were found.
            </div>
          )}
        </div>
      </div>
    </StandardContentWrapper>
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
