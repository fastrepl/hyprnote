import { cn } from "@hypr/utils";
import { DependencyList, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useListener } from "../../../../../../../contexts/listener";
import { useSegments } from "./segment";

export function TranscriptViewer({ sessionId }: { sessionId: string }) {
  const segments = useSegments(sessionId);
  return <Renderer segments={segments} sessionId={sessionId} />;
}

function Renderer({ segments, sessionId }: { segments: ReturnType<typeof useSegments>; sessionId: string }) {
  const { containerRef, isAtBottom, scrollToBottom } = useScrollToBottom([segments]);
  const active = useListener((state) => state.status === "running_active" && state.sessionId === sessionId);

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className={cn([
          "space-y-8 h-full overflow-y-auto overflow-x-hidden",
          "px-0.5 pb-16 scroll-pb-[8rem]",
          true ? "scrollbar-none" : "scroll-pb-[4rem]",
        ])}
      >
        {segments.map(
          (segment, i) => <Segment key={i} segment={segment} />,
        )}
      </div>

      {(!isAtBottom && active) && (
        <button
          onClick={scrollToBottom}
          className={cn([
            "absolute bottom-3 left-1/2 -translate-x-1/2",
            "px-4 py-2 rounded-full",
            "shadow-lg bg-neutral-800 hover:bg-neutral-700",
            "text-white text-xs font-light",
            "transition-all duration-200",
            "z-30",
          ])}
        >
          Go to bottom
        </button>
      )}
    </div>
  );
}

function Segment({ segment }: { segment: ReturnType<typeof useSegments>[number] }) {
  const timestamp = segment.words.length > 0
    ? `${formatTimestamp(segment.words[0].start_ms)} - ${
      formatTimestamp(segment.words[segment.words.length - 1].end_ms)
    }`
    : "00:00 - 00:00";

  return (
    <section>
      <p
        className={cn([
          "sticky top-0 z-20",
          "-mx-3 px-3 py-1",
          "bg-background",
          "border-b border-neutral-200",
          "text-neutral-500 text-xs font-light",
          "flex items-center justify-between",
        ])}
      >
        <span>Channel {segment.channel}</span>
        <span className="font-mono">{timestamp}</span>
      </p>

      <div className="mt-1.5 text-sm leading-relaxed break-words overflow-wrap-anywhere">
        {segment.words.map((word, idx) => (
          <span
            key={`${word.start_ms}-${idx}`}
            className={cn([
              !word.isFinal && ["opacity-60", "italic"],
            ])}
          >
            {word.text}
            {" "}
          </span>
        ))}
      </div>
    </section>
  );
}

function useScrollToBottom(deps: DependencyList) {
  const containerRef = useAutoScroll<HTMLDivElement>(deps);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      const threshold = 100;
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
      setIsAtBottom(isNearBottom);
    };

    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  };

  return { containerRef, isAtBottom, scrollToBottom };
}

function useAutoScroll<T extends HTMLElement>(deps: DependencyList) {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const isAtTop = element.scrollTop === 0;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;

    if (isAtTop || isNearBottom) {
      element.scrollTop = element.scrollHeight;
    }
  }, deps);

  return ref;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
