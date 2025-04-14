import { EarIcon } from "lucide-react";
import { forwardRef, useEffect, useRef } from "react";

import { useTranscript } from "../hooks/useTranscript";

interface TranscriptProps {
  sessionId: string;
}

const Transcript = forwardRef<HTMLDivElement, TranscriptProps>(
  ({ sessionId }, ref) => {
    const { timeline, isLive } = useTranscript(sessionId);
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
        {items.map((item, index) => (
          <div key={index}>
            <p>{item.text}</p>
          </div>
        ))}

        {isLive && (
          <div className="flex items-center gap-2 justify-center py-2 text-neutral-400">
            <EarIcon size={14} /> Listening... (there might be a delay)
          </div>
        )}
      </div>
    );
  },
);

Transcript.displayName = "Transcript";

export default Transcript;
