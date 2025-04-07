import { useEffect, useRef } from "react";
import Transcript from "./transcript";
import { useTranscript } from "../hooks/useTranscript";

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

  return timeline ? (
    <Transcript
      ref={transcriptRef}
      transcript={timeline}
      isLive={isLive}
    />
  ) : null;
}
