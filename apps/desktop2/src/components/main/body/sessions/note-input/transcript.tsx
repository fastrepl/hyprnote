import { ChevronDownIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as persisted from "../../../../../store/tinybase/persisted";

import { Button } from "@hypr/ui/components/ui/button";
import { useSegments } from "../../../../../hooks/useSegments";

export function TranscriptEditorWrapper({
  sessionId,
}: {
  sessionId: string;
}) {
  const value = persisted.UI.useCell("sessions", sessionId, "transcript", persisted.STORE_ID);

  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}

export function TranscriptView({ sessionId }: { sessionId: string }) {
  const segments = useSegments(sessionId);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isAtBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [segments, isAtBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100;
    const atBottom = scrollHeight - scrollTop - clientHeight <= threshold;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const hasContent = segments.length > 0;

  if (!hasContent) {
    return <div className="h-full" />;
  }

  return (
    <div className="relative h-full flex flex-col">
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-8 pb-6"
        onScroll={handleScroll}
      >
        <div className="px-8 text-[15px] leading-relaxed space-y-4">
          {segments.map((segment, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-xs font-medium text-gray-500">
                Speaker {segment.speaker ?? "Unknown"}
              </div>
              <div className="text-gray-800">
                {segment.words.map(word => word.punctuated_word || word.word).join(" ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          size="sm"
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full shadow-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 z-10 flex items-center gap-1"
          variant="outline"
        >
          <ChevronDownIcon size={14} />
          <span className="text-xs">Go to bottom</span>
        </Button>
      )}
    </div>
  );
}
