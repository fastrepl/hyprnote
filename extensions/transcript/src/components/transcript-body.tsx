import { useEffect, useRef } from "react";
import { useTranscript } from "../hooks/useTranscript";
import Transcript from "./transcript";

interface TranscriptBodyProps {
  sessionId: string;
}

export function TranscriptBody({ sessionId }: TranscriptBodyProps) {
  const { timeline, isLive } = useTranscript(sessionId);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
      });
    };

    if (timeline?.items?.length) {
      scrollToBottom();
    }
  }, [timeline?.items, isLive]);

  return timeline ? <Transcript ref={transcriptRef} transcript={timeline} isLive={isLive} /> : null;
}
