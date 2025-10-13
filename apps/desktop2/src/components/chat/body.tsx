import type { UIMessage } from "ai";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@hypr/ui/lib/utils";
import { useShell } from "../../contexts/shell";
import { ChatBodyMessage } from "./message";

export function ChatBody({ messages }: { messages: UIMessage[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { chat } = useShell();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className={cn([
        "flex-1 overflow-y-auto",
        chat.mode === "RightPanelOpen" && "border mt-1 mr-1 rounded-md rounded-b-none",
      ])}
    >
      {messages.length === 0 ? <ChatBodyEmpty /> : <ChatBodyNonEmpty messages={messages} />}
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

function ChatBodyNonEmpty({ messages }: { messages: UIMessage[] }) {
  return (
    <div className="flex flex-col">
      {messages.map((message) => <ChatBodyMessage key={message.id} message={message} />)}
    </div>
  );
}
