interface ChatItem {
  id: string;
  title: string;
  time: string;
}

interface HistoryViewProps {
  chatHistory: ChatItem[];
  onChatSelect: () => void;
}

export default function HistoryView({
  chatHistory,
  onChatSelect,
}: HistoryViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search or start new chat"
          className="w-full rounded-lg border bg-neutral-50 px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <div className="mb-3 text-xs font-medium text-neutral-500">Today</div>
        {chatHistory.slice(0, 3).map((chat) => (
          <ChatHistoryItem key={chat.id} chat={chat} onClick={onChatSelect} />
        ))}
        <div className="mb-3 mt-6 text-xs font-medium text-neutral-500">
          Older
        </div>
        {chatHistory.slice(3).map((chat) => (
          <ChatHistoryItem key={chat.id} chat={chat} onClick={onChatSelect} />
        ))}
      </div>
    </div>
  );
}

function ChatHistoryItem({
  chat,
  onClick,
}: {
  chat: ChatItem;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-neutral-100"
      onClick={onClick}
    >
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full border">
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-4"
        >
          <path
            d="M12.5 3L2.5 3.00002C1.67157 3.00002 1 3.67159 1 4.50002V9.50003C1 10.3285 1.67157 11 2.5 11H7.50003C7.63264 11 7.75982 11.0527 7.85358 11.1465L10 13.2929V11.5C10 11.2239 10.2239 11 10.5 11H12.5C13.3284 11 14 10.3285 14 9.50003V4.5C14 3.67157 13.3284 3 12.5 3ZM2.49999 2.00002L12.5 2C13.8807 2 15 3.11929 15 4.5V9.50003C15 10.8807 13.8807 12 12.5 12H11V14.5C11 14.7022 10.8782 14.8845 10.6913 14.9619C10.5045 15.0393 10.2894 14.9965 10.1464 14.8536L7.29292 12H2.5C1.11929 12 0 10.8807 0 9.50003V4.50002C0 3.11931 1.11928 2.00002 2.49999 2.00002Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="flex-1 truncate text-left">
        <div className="text-sm">{chat.title}</div>
        <div className="text-xs text-neutral-500">{chat.time}</div>
      </div>
    </button>
  );
}
