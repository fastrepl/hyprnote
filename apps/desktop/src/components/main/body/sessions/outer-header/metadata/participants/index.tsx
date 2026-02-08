import { ParticipantInput } from "./input";

export function ParticipantsDisplay({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-px bg-border" />
      <ParticipantInput sessionId={sessionId} />
    </div>
  );
}
