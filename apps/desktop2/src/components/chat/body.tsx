import type { ChatStatus, UIMessage } from "ai";
import { Loader2, MessageCircle, RotateCcw, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@hypr/ui/lib/utils";
import { useShell } from "../../contexts/shell";
import { ChatBodyMessage } from "./message";

export function ChatBody({
  messages,
  status,
  error,
  onReload,
  onStop,
}: {
  messages: UIMessage[];
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
        chat.mode === "RightPanelOpen" && "border mt-1 mr-1 rounded-md rounded-b-none",
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
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error;
  onReload?: () => void;
  onStop?: () => void;
}) {
  const showErrorState = status === "error" && error;
  const showLoadingState = (status === "submitted" || status === "streaming")
    && messages[messages.length - 1]?.role !== "assistant";

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
        <ChatBodyMessage
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

function LoadingMessage({ onCancelAndRetry }: { onCancelAndRetry?: () => void }) {
  return (
    <div className="flex px-4 py-2 justify-start">
      <div
        className={cn([
          "max-w-[80%] rounded-2xl px-4 py-2 bg-gray-100 text-gray-800",
          onCancelAndRetry && "relative group",
        ])}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
        {onCancelAndRetry && (
          <button
            onClick={onCancelAndRetry}
            className={cn([
              "absolute -top-1 -right-1",
              "opacity-0 group-hover:opacity-100",
              "transition-opacity",
              "p-1 rounded-full",
              "bg-gray-200 hover:bg-gray-300",
              "text-gray-600 hover:text-gray-800",
            ])}
            aria-label="Cancel and retry"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorMessage({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex px-4 py-2 justify-start">
      <div
        className={cn([
          "max-w-[80%] rounded-2xl px-4 py-2 bg-red-50 text-red-600 border border-red-200",
          onRetry && "relative group",
        ])}
      >
        <p className="text-sm">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn([
              "absolute -top-1 -right-1",
              "opacity-0 group-hover:opacity-100",
              "transition-opacity",
              "p-1 rounded-full",
              "bg-red-100 hover:bg-red-200",
              "text-red-600 hover:text-red-800",
            ])}
            aria-label="Retry"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
