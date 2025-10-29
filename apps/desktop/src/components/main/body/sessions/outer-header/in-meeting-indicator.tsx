import { Button } from "@hypr/ui/components/ui/button";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { cn } from "@hypr/utils";

import { useHover } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";

import { useListener } from "../../../../../contexts/listener";

type SoundIndicatorProps = {
  value: number | Array<number>;
  color?: string;
  size?: "default" | "long";
  height?: number;
  width?: number;
  stickWidth?: number;
  gap?: number;
};

export function SoundIndicator({
  value,
  color,
  size = "long",
  height,
  width,
  stickWidth,
  gap,
}: SoundIndicatorProps) {
  const u16max = 65535;

  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    const sample = Array.isArray(value)
      ? (value.reduce((sum, v) => sum + v, 0) / value.length) / u16max
      : value / u16max;
    setAmplitude(Math.min(sample, 1));
  }, [value]);

  return (
    <DancingSticks
      amplitude={amplitude}
      color={color}
      size={size}
      height={height}
      width={width}
      stickWidth={stickWidth}
      gap={gap}
    />
  );
}

export function InMeetingIndicator({ sessionId }: { sessionId: string }) {
  const [ref, hovered] = useHover();

  const { active, stop, amplitude } = useListener((state) => ({
    active: state.status === "running_active" && state.sessionId === sessionId,
    stop: state.stop,
    amplitude: state.amplitude,
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
