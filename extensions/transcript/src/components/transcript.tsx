import { EarIcon, Loader2Icon } from "lucide-react";
import { forwardRef, useEffect, useRef } from "react";

import { useSessions } from "@hypr/utils/contexts";
import { useTranscript } from "../hooks/useTranscript";

interface TranscriptProps {
  sessionId?: string;
}

const Transcript = forwardRef<HTMLDivElement, TranscriptProps>(
  ({ sessionId }, ref) => {
    // Get current session ID if none is provided
    const currentSessionId = useSessions((s) => s.currentSessionId);
    const effectiveSessionId = sessionId || currentSessionId;

    const { timeline, isLive, isLoading } = useTranscript(effectiveSessionId);
    const localRef = useRef<HTMLDivElement>(null);
    const transcriptRef = ref || localRef;

    useEffect(() => {
      const scrollToBottom = () => {
        requestAnimationFrame(() => {
          const element = ref ? ref : localRef.current;
          if (element && "scrollTop" in element) {
            element.scrollTop = element.scrollHeight;
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
        ref={transcriptRef}
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
                    <p>{item.text}</p>
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
  },
);

Transcript.displayName = "Transcript";

export default Transcript;
