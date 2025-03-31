import { EventChip } from "./event-chip";
import { ParticipantsChip } from "./participants-chip";
import { TagChip } from "./tag-chip";

interface ChipsProps {
  sessionId: string;
  hashtags?: string[];
}

export default function Chips({ sessionId, hashtags = [] }: ChipsProps) {
  return (
    <div className="-mx-1.5 flex flex-row items-center px-8 pb-4 pt-1 overflow-x-auto scrollbar-none whitespace-nowrap">
      <EventChip sessionId={sessionId} />
      <ParticipantsChip sessionId={sessionId} />
      <TagChip sessionId={sessionId} hashtags={hashtags} />
    </div>
  );
}
