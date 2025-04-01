import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";
import { Message } from "./types";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
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
      <div className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full">{message.content}</div>
    </div>
  );
}
