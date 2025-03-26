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
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
      <div ref={messagesEndRef} />
    </div>
  );
}
