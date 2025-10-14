import type { ChatStatus } from "ai";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@hypr/ui/lib/utils";
import type { HyprUIMessage } from "../../chat/types";
import { useShell } from "../../contexts/shell";
import { ErrorMessage } from "./message/error";
import { LoadingMessage } from "./message/loading";
import { NormalMessage } from "./message/normal";
import { hasRenderableContent } from "./shared";

export function ChatBody({
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { chat } = useShell();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status, error]);

  return (
    <div
      ref={scrollRef}
      className={cn([
        "flex-1 overflow-y-auto",
        chat.mode === "RightPanelOpen" && "border mt-1 rounded-md rounded-b-none",
      ])}
    >
      {messages.length === 0
        ? <ChatBodyEmpty />
        : <ChatBodyNonEmpty messages={messages} status={status} error={error} onReload={onReload} onStop={onStop} />}
    </div>
  );
}

function ChatBodyEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <MessageCircle className="w-12 h-12 text-neutral-300 mb-3" />
      <p className="text-neutral-600 text-sm mb-2">Ask the AI assistant about anything.</p>
      <p className="text-neutral-400 text-xs">It can also do few cool stuff for you.</p>
    </div>
  );
}

function ChatBodyNonEmpty({
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
