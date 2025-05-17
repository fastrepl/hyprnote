import { EarIcon, Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

import { commands as windowsCommands, events as windowsEvents } from "@hypr/plugin-windows";
import { Badge } from "@hypr/ui/components/ui/badge";
import { useSessions } from "@hypr/utils/contexts";
import { useTranscript } from "./useTranscript";

export function Transcript({ sessionId }: { sessionId?: string }) {
  const currentSessionId = useSessions((s) => s.currentSessionId);
  const effectiveSessionId = sessionId || currentSessionId;

  const ref = useRef<HTMLDivElement>(null);
  const { words, isLive, isLoading } = useTranscript(effectiveSessionId);

  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        if (ref.current && "scrollTop" in ref.current) {
          ref.current.scrollTop = ref.current.scrollHeight;
        }
      });
    };

    if (words.length) {
      scrollToBottom();
    }
  }, [words, isLive, ref]);

  useEffect(() => {
    let unlisten: () => void;

    windowsEvents.windowDestroyed.listen(({ payload: { window } }) => {
      if (window.type === "transcript") {
        windowsCommands.windowShow({ type: "main" });
      }
    }).then((u) => {
      unlisten = u;
    });

    return () => unlisten?.();
  }, []);

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
            {words.map((word, i) => (
              <div key={`${word.text}-${i}`}>
                <p>
                  {word.text}
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
