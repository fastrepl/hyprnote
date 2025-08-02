import { useRightPanel } from "@/contexts";
import { MessageCircleMore } from "lucide-react";
import { EventChip } from "./event-chip";
import { ParticipantsChip } from "./participants-chip";
import { PastNotesChip } from "./past-notes-chip";
import { TagChip } from "./tag-chip";

function StartChatButton() {
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
      <span className="truncate">Chat</span>
    </button>
  );
}

export default function NoteHeaderChips({ sessionId, hashtags = [] }: {
  sessionId: string;
  hashtags?: string[];
}) {
  return (
    <div className="-mx-1.5 flex flex-row items-center overflow-x-auto scrollbar-none whitespace-nowrap">
      <EventChip sessionId={sessionId} />
      <ParticipantsChip sessionId={sessionId} />
      <TagChip sessionId={sessionId} hashtags={hashtags} />
      <StartChatButton />
      <PastNotesChip sessionId={sessionId} />
    </div>
  );
}
