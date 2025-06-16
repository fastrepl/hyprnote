import { EventChip } from "./event-chip";
import { ParticipantsChip } from "./participants-chip";
import { PastNotesChip } from "./past-notes-chip";
import { TagChip } from "./tag-chip";

export default function NoteHeaderChips({ sessionId }: {
  sessionId: string;
}) {
  return (
    <div className="-mx-1.5 flex flex-row items-center overflow-x-auto scrollbar-none whitespace-nowrap">
      <EventChip sessionId={sessionId} />
      <ParticipantsChip sessionId={sessionId} />
      <TagChip sessionId={sessionId} />
      <PastNotesChip sessionId={sessionId} />
    </div>
  );
}
