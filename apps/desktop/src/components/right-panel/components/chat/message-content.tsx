import { Message } from "./types";
import { MarkdownCard } from "./markdown-card";

interface MessageContentProps {
  message: Message;
  sessionTitle?: string;
}

export function MessageContent({ message, sessionTitle }: MessageContentProps) {
  // If no parts are parsed, show regular content
  if (!message.parts || message.parts.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-sm text-neutral-800">
        {message.content}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {message.parts.map((part, index) => (
        <div key={index}>
          {part.type === 'text' ? (
            <div className="whitespace-pre-wrap text-sm text-neutral-800">
              {part.content}
            </div>
          ) : (
            <MarkdownCard 
              content={part.content} 
              isComplete={part.isComplete || false}
              sessionTitle={sessionTitle}
            />
          )}
        </div>
      ))}
    </div>
  );
}
