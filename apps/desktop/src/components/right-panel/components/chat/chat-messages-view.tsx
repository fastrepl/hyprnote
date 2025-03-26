import { useRef, useEffect } from "react";
import { Message } from "./types";
import { ChatMessage } from "./chat-message";

interface ChatMessagesViewProps {
  messages: Message[];
}

export function ChatMessagesView({ messages }: ChatMessagesViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
