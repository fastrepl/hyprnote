import { useEffect, useRef } from "react";
import { ChatMessage } from "./chat-message";
import { Message } from "./types";

interface ChatMessagesViewProps {
  messages: Message[];
}

export function ChatMessagesView({ messages }: ChatMessagesViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4 scrollbar-none">
      {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
      <div ref={messagesEndRef} />
    </div>
  );
}
