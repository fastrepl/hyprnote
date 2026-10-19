
import { useLingui } from "@lingui/react/macro";

import { ArrowLeft } from "@anlg/ui/components/icons";
import { Button } from "@anlg/ui/components/ui/button";

import { useSessionEvent } from "~/session/hooks/useSessionEvent";
import { useSession } from "~/session/queries";
import { useSessionParticipants } from "~/session/queries/participants";
import { useTabs } from "~/store/zustand/tabs";

function formatInterviewDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function InterviewHeader({ sessionId }: { sessionId: string }) {
  const { t } = useLingui();
  const session = useSession(sessionId);
  const event = useSessionEvent(sessionId);
  const participants = useSessionParticipants(sessionId);
  const canGoBack = useTabs((state) => state.canGoBack);
  const goBack = useTabs((state) => state.goBack);

  if (!session) return null;

  const title = session.title.trim() || t`Untitled`;
  const date = formatInterviewDate(event?.started_at ?? session.created_at);
  const people = participants
    .map((participant) => ({
      id: participant.id,
      name: participant.name.trim() || participant.email.trim(),
      details: [participant.jobTitle, participant.organizationName]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" · "),
    }))
    .filter((person) => person.name);

  return (
    <div
      data-interview-header
      className="border-border/70 flex shrink-0 flex-col gap-2 border-b px-3 pt-2 pb-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        {canGoBack ? (
          <Button
            variant="ghost"
            size="sm"
            data-tauri-drag-region="false"
            onClick={goBack}
          >
            <ArrowLeft size={14} />
            {t`Back`}
          </Button>
        ) : null}
        <h1 className="text-foreground min-w-0 truncate text-lg font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {date ? (
          <span className="text-muted-foreground text-xs">{date}</span>
        ) : null}
        {people.length > 0 ? (
          <p className="text-muted-foreground min-w-0 truncate text-xs">
            <span className="font-medium">{t`Participants`}: </span>
            {people.map((person, index) => (
              <span key={person.id}>
                {index > 0 ? "; " : ""}
                {person.name}
                {person.details ? ` (${person.details})` : ""}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}
