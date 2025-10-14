import { ChevronDownIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { events as listenerEvents, type Word2 } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import * as persisted from "../../../../store/tinybase/persisted";
import { rowIdfromTab, type Tab } from "../../../../store/zustand/tabs";

export function TranscriptView({ tab }: { tab: Tab }) {
  const sessionId = rowIdfromTab(tab);
  const sessionRow = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);

  const [finalWords, setFinalWords] = useState<Word2[]>([]);
  const [partialWords, setPartialWords] = useState<Word2[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const transcript = sessionRow.transcript ? JSON.parse(sessionRow.transcript as string) : { words: [] };
  const storedWords = transcript.words || [];

  useEffect(() => {
    setFinalWords(storedWords);
    setPartialWords([]);
  }, [JSON.stringify(storedWords)]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listenerEvents.sessionEvent.listen(({ payload }: { payload: any }) => {
      if (payload.type === "finalWords") {
        const words = Object.values(payload.words).flat().filter((v): v is Word2 => !!v);
        setFinalWords((existing) => [...existing, ...words]);
      } else if (payload.type === "partialWords") {
        const words = Object.values(payload.words).flat().filter((v): v is Word2 => !!v);
        setPartialWords(words);
      }
    }).then((fn: () => void) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (isAtBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [finalWords, partialWords, isAtBottom]);

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

  const hasContent = finalWords.length > 0 || partialWords.length > 0;

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
        <div className="px-8 text-[15px] leading-relaxed break-all space-y-2">
          <span className="text-gray-800">
            {finalWords.map(word => word.text).join(" ")}
          </span>
          {partialWords.length > 0 && (
            <span className="text-gray-400">
              {" "}
              {partialWords.map(word => word.text).join(" ")}
            </span>
          )}
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
