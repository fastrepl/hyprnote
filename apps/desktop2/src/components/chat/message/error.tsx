import { RotateCcw } from "lucide-react";

import { ActionButton, MessageBubble, MessageContainer } from "./shared";

export function ErrorMessage({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <MessageContainer align="start">
      <MessageBubble variant="error" withActionButton={!!onRetry}>
        <p className="text-sm">{error.message}</p>
        {onRetry && (
          <ActionButton
            onClick={onRetry}
            variant="error"
            icon={RotateCcw}
            label="Retry"
          />
        )}
      </MessageBubble>
    </MessageContainer>
  );
}
