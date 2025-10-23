import { useMeetingMetadata } from "./shared";

export function MeetingDescription({ sessionId }: { sessionId: string }) {
  const meta = useMeetingMetadata(sessionId)!;

  if (!meta.description) {
    return null;
  }

  return (
    <div className="text-sm text-neutral-700 whitespace-pre-wrap break-words">
      {meta.description}
    </div>
  );
}
