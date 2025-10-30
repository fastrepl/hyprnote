import { useHover } from "@uidotdev/usehooks";
import { MicOff } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";
import { useListener } from "../../../../../contexts/listener";
import { SoundIndicator } from "../../shared";

export function InMeetingIndicator({ sessionId }: { sessionId: string }) {
  const [ref, hovered] = useHover();

  const { active, stop, amplitude, muted } = useListener((state) => ({
    active: state.status === "running_active" && state.sessionId === sessionId,
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
      onClick={stop}
      className={cn([
        "text-red-500 hover:text-red-600",
        "bg-red-50 hover:bg-red-100",
        "w-[75px]",
      ])}
    >
      {hovered
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
