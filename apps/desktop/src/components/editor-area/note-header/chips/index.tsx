import { EventChip } from "./event-chip";
import { ParticipantsChip } from "./participants-chip";
import { PastNotesChip } from "./past-notes-chip";
import { TagChip } from "./tag-chip";

export default function NoteHeaderChips({
  sessionId,
  hashtags = [],
  isVeryNarrow = false,
  isNarrow = false,
}: {
  sessionId: string;
  hashtags?: string[];
  isVeryNarrow?: boolean;
  isNarrow?: boolean;
}) {
  return (
    <div
      className={`flex flex-row items-center overflow-x-auto scrollbar-none whitespace-nowrap ${
        isVeryNarrow ? "-mx-1" : "-mx-1.5"
      }`}
    >
      <EventChip sessionId={sessionId} isVeryNarrow={isVeryNarrow} isNarrow={isNarrow} />
      <ParticipantsChip sessionId={sessionId} isVeryNarrow={isVeryNarrow} isNarrow={isNarrow} />
      <TagChip sessionId={sessionId} hashtags={hashtags} isVeryNarrow={isVeryNarrow} isNarrow={isNarrow} />
      <PastNotesChip sessionId={sessionId} isVeryNarrow={isVeryNarrow} isNarrow={isNarrow} />
    </div>
  );
}
