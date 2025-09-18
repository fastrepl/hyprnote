import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./chat-message";
import { Message } from "./types";

interface ChatMessagesViewProps {
  messages: Message[];
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (markdownContent: string) => void;
  isGenerating?: boolean;
  isStreamingText?: boolean;
}

function ThinkingIndicator() {
  return (
    <>
      <style>
        {`
          @keyframes thinking-dots {
            0%, 20% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }
          .thinking-dot:nth-child(1) { animation-delay: 0s; }
          .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
          .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
          .thinking-dot {
            animation: thinking-dots 1.2s infinite;
            display: inline-block;
          }
        `}
      </style>
      <div style={{ color: "rgb(115 115 115)", fontSize: "0.875rem", padding: "4px 0" }}>
        <span>Thinking</span>
        <span className="thinking-dot">.</span>
        <span className="thinking-dot">.</span>
        <span className="thinking-dot">.</span>
      </div>
    </>
  );
}

export function ChatMessagesView(
  { messages, sessionTitle, hasEnhancedNote, onApplyMarkdown, isGenerating, isStreamingText }: ChatMessagesViewProps,
) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showThinking, setShowThinking] = useState(false);
  const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const shouldShowThinking = () => {
    if (!isGenerating) {
      return false;
    }

    if (messages.length === 0) {
      return true;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.isUser) {
      return true;
    }

    if (!lastMessage.isUser && !isStreamingText) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    const shouldShow = shouldShowThinking();

    if (thinkingTimeoutRef.current) {
      clearTimeout(thinkingTimeoutRef.current);
      thinkingTimeoutRef.current = null;
    }

    if (shouldShow) {
      thinkingTimeoutRef.current = setTimeout(() => {
        setShowThinking(true);
      }, 200);
    } else {
      setShowThinking(false);
    }

    return () => {
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
      }
    };
  }, [isGenerating, isStreamingText, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showThinking]);

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

      {/* Thinking indicator with debounce - no flicker! */}
      {showThinking && <ThinkingIndicator />}

      <div ref={messagesEndRef} />
    </div>
  );
}
