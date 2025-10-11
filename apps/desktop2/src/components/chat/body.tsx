import type { UIMessage } from "ai";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

export function ChatBody({ messages }: { messages: UIMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return <ChatBodyEmpty />;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col">
        {messages.map((message) => <ChatBodyMessage key={message.id} message={message} />)}
      </div>
    </div>
  );
}

function ChatBodyEmpty() {
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MessageCircle className="w-12 h-12 text-neutral-300 mb-3" />
        <p className="text-neutral-600 text-sm mb-2">Ask the AI assistant about anything.</p>
        <p className="text-neutral-400 text-xs">It can also do few cool stuff for you.</p>
      </div>
    </div>
  );
}

function ChatBodyMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const content = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} px-4 py-2`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-neutral-100 text-neutral-900"
        }`}
      >
        <Markdown content={content} />
      </div>
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  return (
    <Streamdown className="prose prose-sm dark:prose-invert max-w-none">
      {content}
    </Streamdown>
  );
}
