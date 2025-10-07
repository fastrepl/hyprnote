import { ChatSession } from "./types";

interface ChatHistoryItemProps {
  chat: ChatSession;
  onSelect: (chatId: string) => void;
  formatDate: (date: Date) => string;
}

export function ChatHistoryItem({ chat, onSelect, formatDate }: ChatHistoryItemProps) {
  return (
    <button
      onClick={() => onSelect(chat.id)}
      className="w-full text-left px-4 py-3 hover:bg-neutral-100 transition-colors"
    >
      <div className="flex justify-between items-center">
        <div className="font-medium text-sm">{chat.title}</div>
        <div className="text-xs text-muted-foreground">{formatDate(chat.lastMessageDate)}</div>
      </div>
    </button>
  );
}
