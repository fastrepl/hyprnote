import { MarkdownCard } from "./markdown-card";
import { Message } from "./types";

interface MessageContentProps {
  message: Message;
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (markdownContent: string) => void;
}

export function MessageContent({ message, sessionTitle, hasEnhancedNote, onApplyMarkdown }: MessageContentProps) {
  // If no parts are parsed, show regular content
  if (!message.parts || message.parts.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-sm text-neutral-800 select-text">
        {message.content}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {message.parts.map((part, index) => (
        <div key={index}>
          {part.type === "text"
            ? (
              <div className="whitespace-pre-wrap text-sm text-neutral-800 select-text">
                {part.content}
              </div>
            )
            : (
              <MarkdownCard
                content={part.content}
                isComplete={part.isComplete || false}
                sessionTitle={sessionTitle}
                hasEnhancedNote={hasEnhancedNote}
                onApplyMarkdown={onApplyMarkdown}
              />
            )}
        </div>
      ))}
    </div>
  );
}
