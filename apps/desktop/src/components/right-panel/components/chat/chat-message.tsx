import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";
import { MessageContent } from "./message-content";
import { Message } from "./types";

interface ChatMessageProps {
  message: Message;
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (markdownContent: string) => void;
}

export function ChatMessage({ message, sessionTitle, hasEnhancedNote, onApplyMarkdown }: ChatMessageProps) {
  return (
    <div className="w-full mb-4">
      <div
        className={cn(
          "font-semibold text-xs mb-1",
          message.isUser ? "text-neutral-700" : "text-amber-700",
        )}
      >
        {message.isUser ? <Trans>User:</Trans> : <Trans>Assistant:</Trans>}
      </div>
      <MessageContent
        message={message}
        sessionTitle={sessionTitle}
        hasEnhancedNote={hasEnhancedNote}
        onApplyMarkdown={onApplyMarkdown}
      />
    </div>
  );
}
