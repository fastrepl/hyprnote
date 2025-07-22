import { useEffect, useRef } from "react";
import { ChatMessage } from "./chat-message";
import { Message } from "./types";

interface ChatMessagesViewProps {
  messages: Message[];
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (markdownContent: string) => void;
}

export function ChatMessagesView({ messages, sessionTitle, hasEnhancedNote, onApplyMarkdown }: ChatMessagesViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          sessionTitle={sessionTitle}
          hasEnhancedNote={hasEnhancedNote}
          onApplyMarkdown={onApplyMarkdown}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
