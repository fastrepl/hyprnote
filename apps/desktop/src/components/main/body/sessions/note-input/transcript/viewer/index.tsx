import { cn } from "@hypr/utils";
import { DependencyList, useLayoutEffect, useRef } from "react";
import { useSegments } from "./segment";

export function TranscriptViewer({ sessionId }: { sessionId: string }) {
  const segments = useSegments(sessionId);
  return <Renderer segments={segments} />;
}

function Renderer({ segments }: { segments: ReturnType<typeof useSegments> }) {
  const containerRef = useAutoScroll<HTMLDivElement>([segments]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn([
        "space-y-8 h-full overflow-y-auto overflow-x-hidden",
        "px-0.5 pb-32 scroll-pb-[8rem]",
      ])}
    >
      {segments.map(
        (segment, i) => <Segment key={i} segment={segment} />,
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
