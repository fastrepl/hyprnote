import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "@hypr/utils/ai";
import { UIMessageComponent } from "./ui-message";

interface ChatMessagesViewProps {
  messages: UIMessage[];
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (markdownContent: string) => void;
  isSubmitted?: boolean;
  isStreaming?: boolean;
  isReady?: boolean;
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
  { messages, sessionTitle, hasEnhancedNote, onApplyMarkdown, isSubmitted, isStreaming, isReady }: ChatMessagesViewProps,
) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showThinking, setShowThinking] = useState(false);
  const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const shouldShowThinking = () => {
    // Show thinking when request is submitted but not yet streaming
    if (isSubmitted) {
      return true;
    }

    /*
    // Keep showing if we're generating but haven't started streaming text yet
    if (isStreaming) {
      // Check if we have any assistant content streaming
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        // Hide thinking if assistant has started responding with text
        if (lastMessage.role === "assistant" && 
            lastMessage.parts?.some(p => p.type === "text" && p.text)) {
          return false;
        }
      }
      return true;
    }
    */

    if (!isReady && !isStreaming) {
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
  }, [isSubmitted, isStreaming, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
      {messages.map((message) => (
        <UIMessageComponent
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
