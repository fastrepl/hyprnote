import type { ChatStatus, UIMessage } from "ai";
import { Loader2, MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@hypr/ui/lib/utils";
import { useShell } from "../../contexts/shell";
import { ChatBodyMessage } from "./message";

export function ChatBody({
  messages,
  status,
  error,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error;
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
        : <ChatBodyNonEmpty messages={messages} status={status} error={error} />}
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
}: {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error;
}) {
  const showErrorState = status === "error" && error;
  const showLoadingState = (status === "submitted" || status === "streaming")
    && messages[messages.length - 1]?.role !== "assistant";

  return (
    <div className="flex flex-col">
      {messages.map((message) => <ChatBodyMessage key={message.id} message={message} />)}
      {showLoadingState && <LoadingMessage />}
      {showErrorState && <ErrorMessage error={error} />}
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex px-4 py-2 justify-start">
      <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-gray-100 text-gray-800">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ error }: { error: Error }) {
  return (
    <div className="flex px-4 py-2 justify-start">
      <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-red-50 text-red-600 border border-red-200">
        <p className="text-sm">{error.message}</p>
      </div>
    </div>
  );
}
