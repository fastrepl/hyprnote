import type { ChatStatus } from "ai";

import type { HyprUIMessage } from "../../../chat/types";
import { ErrorMessage } from "../message/error";
import { LoadingMessage } from "../message/loading";
import { NormalMessage } from "../message/normal";
import { hasRenderableContent } from "../shared";

export function ChatBodyNonEmpty({
  messages,
  status,
  error,
  onReload,
  onStop,
}: {
  messages: HyprUIMessage[];
  status: ChatStatus;
  error?: Error;
  onReload?: () => void;
  onStop?: () => void;
}) {
  const showErrorState = status === "error" && error;
  const lastMessage = messages[messages.length - 1];
  const showLoadingState = (status === "submitted" || status === "streaming")
    && (lastMessage?.role !== "assistant" || !hasRenderableContent(lastMessage));

  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }

  const handleCancelAndRetry = () => {
    if (onStop) {
      onStop();
    }
    if (onReload) {
      setTimeout(() => {
        onReload();
      }, 100);
    }
  };

  return (
    <div className="flex flex-col">
      {messages.map((message, index) => (
        <NormalMessage
          key={message.id}
          message={message}
          handleReload={message.role === "assistant" && index === lastAssistantIndex && onReload ? onReload : undefined}
        />
      ))}
      {showLoadingState && <LoadingMessage onCancelAndRetry={onStop && onReload ? handleCancelAndRetry : undefined} />}
      {showErrorState && <ErrorMessage error={error} onRetry={onReload} />}
    </div>
  );
}
