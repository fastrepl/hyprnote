import { MessageContent } from "./message-content";
import { Message } from "./types";

interface ChatMessageProps {
  message: Message;
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (markdownContent: string) => void;
}

export function ChatMessage({ message, sessionTitle, hasEnhancedNote, onApplyMarkdown }: ChatMessageProps) {
  if (message.isUser) {
    return (
      <div className="w-full mb-4 flex justify-end">
        <div className="max-w-[80%]">
          <div className="border border-input rounded-lg overflow-clip bg-white">
            <div className="px-3 py-2">
              <MessageContent
                message={message}
                sessionTitle={sessionTitle}
                hasEnhancedNote={hasEnhancedNote}
                onApplyMarkdown={onApplyMarkdown}
              />
            </div>
          </div>
          {/* Timestamp below the message */}
          <div className="text-xs text-neutral-500 mt-1 text-right">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-4">
      <MessageContent
        message={message}
        sessionTitle={sessionTitle}
        hasEnhancedNote={hasEnhancedNote}
        onApplyMarkdown={onApplyMarkdown}
      />
    </div>
  );
}
