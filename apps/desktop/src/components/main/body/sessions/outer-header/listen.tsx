import { useHover } from "@uidotdev/usehooks";
import { MicOff } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";
import { useListener } from "../../../../../contexts/listener";
import { useStartListening } from "../../../../../hooks/useStartListening";
import { useSTTConnection } from "../../../../../hooks/useSTTConnection";
import { SoundIndicator } from "../../shared";
import { useHasTranscript } from "../shared";

export function ListenButton({ sessionId }: { sessionId: string }) {
  const active = useListener((state) => state.status !== "inactive" && state.sessionId === sessionId);
  const hasTranscript = useHasTranscript(sessionId);

  if (active) {
    return <InMeetingIndicator sessionId={sessionId} />;
  }

  if (hasTranscript) {
    return <StartButton sessionId={sessionId} />;
  }

  return null;
}

function StartButton({ sessionId }: { sessionId: string }) {
  const sttConnection = useSTTConnection();
  const handleClick = useStartListening(sessionId);

  const isDisabled = !sttConnection;

  const icon = (
    <div className="relative size-2">
      <div className="absolute inset-0 rounded-full bg-red-600"></div>
      <div
        className={cn([
          "absolute inset-0 rounded-full bg-red-300",
          !isDisabled && "animate-ping",
        ])}
      >
      </div>
    </div>
  );

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn([
        "bg-black text-white hover:bg-neutral-800",
      ])}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-neutral-100 hover:text-neutral-200">Start listening</span>
      </div>
    </Button>
  );
}

function InMeetingIndicator({ sessionId }: { sessionId: string }) {
  const [ref, hovered] = useHover();

  const { active, finalizing, stop, amplitude, muted } = useListener((state) => ({
    active: state.status !== "inactive" && state.sessionId === sessionId,
    finalizing: state.status === "finalizing" && state.sessionId === sessionId,
    stop: state.stop,
    amplitude: state.amplitude,
    muted: state.muted,
  }));

  if (!active) {
    return null;
  }

  return (
    <Button
      ref={ref}
      size="sm"
      variant="ghost"
      onClick={finalizing ? undefined : stop}
      disabled={finalizing}
      className={cn([
        finalizing
          ? [
            "text-neutral-500",
            "bg-neutral-100",
            "cursor-wait",
          ]
          : [
            "text-red-500 hover:text-red-600",
            "bg-red-50 hover:bg-red-100",
          ],
        "w-[75px]",
      ])}
    >
      {finalizing
        ? (
          <div className="flex items-center gap-1.5">
            <span className="animate-pulse">Finalizing...</span>
          </div>
        )
        : hovered
        ? (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-500 rounded-none" />
            <span>Stop</span>
          </div>
        )
        : muted
        ? (
          <div className="flex items-center gap-1.5">
            <MicOff size={14} />
            <SoundIndicator
              value={[amplitude.mic, amplitude.speaker]}
              color="#ef4444"
              size="long"
              height={16}
              width={32}
              stickWidth={2}
              gap={1}
            />
          </div>
        )
        : (
          <SoundIndicator
            value={[amplitude.mic, amplitude.speaker]}
            color="#ef4444"
            size="long"
            height={16}
            width={32}
            stickWidth={2}
            gap={1}
          />
        )}
    </Button>
  );
}
