import { HistoryIcon, PlusCircleIcon, XIcon } from "lucide-react";

interface HeaderProps {
  showHistory: boolean;
  onBackClick: () => void;
  onNewChat: () => void;
  onHistoryClick: () => void;
  onCloseClick: () => void;
}

export default function Header({
  showHistory,
  onBackClick,
  onNewChat,
  onHistoryClick,
  onCloseClick,
}: HeaderProps) {
  if (showHistory) {
    return (
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-gray-100"
            onClick={onBackClick}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="size-4"
            >
              <path
                d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div className="text-sm font-medium">All chats</div>
        </div>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:text-neutral-900"
          onClick={onNewChat}
        >
          New chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="text-sm font-medium">Note Chat</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg p-1.5 hover:bg-gray-100"
          onClick={onNewChat}
        >
          <PlusCircleIcon className="size-4" />
        </button>

        <button
          type="button"
          className="rounded-lg p-1.5 hover:bg-gray-100"
          onClick={onHistoryClick}
        >
          <HistoryIcon className="size-4" />
        </button>

        <button
          onClick={onCloseClick}
          className="rounded-lg p-1.5 hover:bg-gray-100"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
