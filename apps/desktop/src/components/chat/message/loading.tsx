import { Loader2, X } from "lucide-react";

import { ActionButton, MessageBubble, MessageContainer } from "./shared";

export function LoadingMessage({
  onCancelAndRetry,
}: {
  onCancelAndRetry?: () => void;
}) {
  return (
    <MessageContainer align="start">
      <MessageBubble variant="loading" withActionButton={!!onCancelAndRetry}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
        {onCancelAndRetry && (
          <ActionButton
            onClick={onCancelAndRetry}
            variant="default"
            icon={X}
            label="Cancel and retry"
          />
        )}
      </MessageBubble>
    </MessageContainer>
  );
}
