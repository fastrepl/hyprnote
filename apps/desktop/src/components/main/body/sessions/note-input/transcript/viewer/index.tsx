import { cn } from "@hypr/utils";
import { useSegments } from "./segment";

export function TranscriptViewer({ sessionId }: { sessionId: string }) {
  const segments = useSegments(sessionId);
  return <Renderer segments={segments} />;
}

function Renderer({ segments }: { segments: ReturnType<typeof useSegments> }) {
  if (segments.length === 0) {
    return null;
  }

  return (
    <div
      className={cn([
        "space-y-4 h-full overflow-y-auto overflow-x-hidden",
        "px-0.5 pb-16 scroll-pb-[4rem]",
      ])}
    >
      {segments.map(
        (segment, i) => <Segment key={i} segment={segment} />,
      )}
    </div>
  );
}

function Segment({ segment }: { segment: ReturnType<typeof useSegments>[number] }) {
  return (
    <section>
      <p
        className={cn([
          "sticky top-0 z-20",
          "-mx-3 px-3 py-1 mb-1.5",
          "bg-background",
          "border-b border-border",
          "text-xs font-light",
        ])}
      >
        Channel {segment.channel}
      </p>

      <div className="text-sm leading-relaxed break-words overflow-wrap-anywhere">
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
