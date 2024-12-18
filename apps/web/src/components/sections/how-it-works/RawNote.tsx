import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface RawNoteProps {
  content: string;
  typingContent?: string;
  isRecording: boolean;
  className?: string;
}

export function RawNote({
  content,
  typingContent,
  isRecording,
  className,
}: RawNoteProps) {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    if (!typingContent || !isRecording) {
      setTypedText("");

      return;
    }

    setTypedText("");

    let index = 0;
    const interval = setInterval(() => {
      if (index < typingContent.length) {
        setTypedText(typingContent.slice(0, index + 1));
        index++;
      }
    }, 50);

    return () => clearInterval(interval);
  }, [typingContent, isRecording]);

  return (
    <div
      className={cn(
        "p-6 relative bg-white h-[400px] overflow-y-auto max-w-none text-left text-sm",
        className
      )}
    >
      <div className="whitespace-pre-wrap">
        {content}
        <span className="animate-blink">{typedText || typingContent}</span>
      </div>

      {/* Recording Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div
          className={`w-2 h-2 ${isRecording ? "rounded-full animate-record-blink bg-red-500" : "bg-gray-400"}`}
          style={!isRecording ? { width: "6px", height: "6px" } : undefined}
        />
        <span
          className={`text-xs ${isRecording ? "text-red-500" : "text-gray-400"}`}
        >
          {isRecording ? "Recording" : "Stopped"}
        </span>
      </div>
    </div>
  );
}
