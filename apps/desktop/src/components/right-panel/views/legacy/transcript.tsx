import { EarIcon, Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { useSessions } from "@hypr/utils/contexts";
import { useTranscript } from "./useTranscript";

export function Transcript({ sessionId }: { sessionId?: string }) {
  const currentSessionId = useSessions((s) => s.currentSessionId);
  const effectiveSessionId = sessionId || currentSessionId;

  const ref = useRef<HTMLDivElement>(null);
  const { timeline, isLive, isLoading } = useTranscript(effectiveSessionId);

  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        if (ref.current && "scrollTop" in ref.current) {
          ref.current.scrollTop = ref.current.scrollHeight;
        }
      });
    };

    if (timeline?.items?.length) {
      scrollToBottom();
    }
  }, [timeline?.items, isLive, ref]);

  const items = timeline?.items || [];

  return (
    <div
      ref={ref}
      className="flex-1 scrollbar-none px-4 flex flex-col gap-2 overflow-y-auto text-sm py-4"
    >
      {isLoading
        ? (
          <div className="flex items-center gap-2 justify-center py-2 text-neutral-400">
            <Loader2Icon size={14} className="animate-spin" /> Loading transcript...
          </div>
        )
        : (
          <>
            {items.length > 0
              && items.map((item, index) => (
                <div key={index}>
                  <p
                    className={`select-text ${
                      item.confidence > 0.9
                        ? "font-normal opacity-100"
                        : item.confidence > 0.8
                        ? "font-normal opacity-80"
                        : item.confidence > 0.7
                        ? "font-light opacity-60"
                        : item.confidence > 0.5
                        ? "font-light opacity-70"
                        : item.confidence > 0.3
                        ? "font-extralight opacity-60"
                        : item.confidence > 0.1
                        ? "font-extralight opacity-50"
                        : "font-extralight opacity-40"
                    }`}
                  >
                    {item.text}
                  </p>
                </div>
              ))}

            {isLive && (
              <div className="flex items-center gap-2 justify-center py-2 text-neutral-400">
                <EarIcon size={14} /> Listening... (there might be a delay)
              </div>
            )}
          </>
        )}
    </div>
  );
}

export function TranscriptContent({ sessionId, showLiveBadge }: {
  sessionId: string;
  showLiveBadge: boolean;
}) {
  const { isLive } = useTranscript(sessionId);

  return showLiveBadge && isLive
    ? (
      <Badge
        variant="destructive"
        className="hover:bg-destructive"
      >
        LIVE
      </Badge>
    )
    : null;
}
