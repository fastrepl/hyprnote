import { useRightPanel } from "@/contexts";
import { MessageCircleMore } from "lucide-react";
import { EventChip } from "./event-chip";
import { ParticipantsChip } from "./participants-chip";
import { PastNotesChip } from "./past-notes-chip";
import { TagChip } from "./tag-chip";

function StartChatButton({ isVeryNarrow }: { isVeryNarrow: boolean }) {
  const { togglePanel } = useRightPanel();

  const handleChatClick = () => {
    togglePanel("chat");
  };

  return (
    <button
      onClick={handleChatClick}
      className="flex flex-row items-center gap-1 rounded-md px-2 py-1.5 hover:bg-neutral-100 flex-shrink-0 text-xs transition-colors"
    >
      <MessageCircleMore size={14} className="flex-shrink-0" />
      {!isVeryNarrow && <span className="truncate">Chat</span>}
    </button>
  );
}

export default function NoteHeaderChips({
  sessionId,
  hashtags = [],
  isVeryNarrow = false,
  isNarrow = false,
  isCompact = false,
}: {
  sessionId: string;
  hashtags?: string[];
  isVeryNarrow?: boolean;
  isNarrow?: boolean;
  isCompact?: boolean;
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
      <StartChatButton isVeryNarrow={isVeryNarrow} />
      <PastNotesChip sessionId={sessionId} isVeryNarrow={isVeryNarrow} isNarrow={isNarrow} />
    </div>
  );
}
