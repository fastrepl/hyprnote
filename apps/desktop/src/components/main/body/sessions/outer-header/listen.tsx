import { useHover } from "@uidotdev/usehooks";
import { MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useListener } from "../../../../../contexts/listener";
import { useStartListening } from "../../../../../hooks/useStartListening";
import { useTabs } from "../../../../../store/zustand/tabs";
import {
  ActionableTooltipContent,
  RecordingIcon,
  useHasTranscript,
  useListenButtonState,
} from "../shared";

function ScrollingWaveform({
  amplitude,
  color = "#e5e5e5",
  height = 32,
  width = 120,
  barWidth = 2,
  gap = 1,
  minBarHeight = 2,
  maxBarHeight,
}: {
  amplitude: number;
  color?: string;
  height?: number;
  width?: number;
  barWidth?: number;
  gap?: number;
  minBarHeight?: number;
  maxBarHeight?: number;
}) {
  const resolvedMaxBarHeight = maxBarHeight ?? height;
  const maxBars = Math.floor(width / (barWidth + gap));
  const [bars, setBars] = useState<number[]>(() => Array(maxBars).fill(0));
  const amplitudeRef = useRef(amplitude);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  amplitudeRef.current = amplitude;

  useEffect(() => {
    setBars(Array(maxBars).fill(0));
  }, [maxBars]);

  useEffect(() => {
    const UPDATE_INTERVAL = 30;

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current >= UPDATE_INTERVAL) {
        const amp = amplitudeRef.current;
        const linear = amp < 5 ? 0 : Math.min((amp - 5) / 45, 1);
        const normalized = Math.pow(linear, 0.6);

        setBars((prev) => [...prev.slice(1), normalized]);
        lastUpdateRef.current = timestamp;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        minWidth: width,
        minHeight: height,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          gap,
        }}
      >
        {bars.map((amp, i) => {
          const barHeight =
            minBarHeight + amp * (resolvedMaxBarHeight - minBarHeight);
          return (
            <div
              key={i}
              style={{
                width: barWidth,
                height: barHeight,
                backgroundColor: color,
                borderRadius: barWidth / 2,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ListenButton({ sessionId }: { sessionId: string }) {
  const { shouldRender } = useListenButtonState(sessionId);
  const hasTranscript = useHasTranscript(sessionId);

  if (!shouldRender) {
    return <InMeetingIndicator sessionId={sessionId} />;
  }

  if (hasTranscript) {
    return <StartButton sessionId={sessionId} />;
  }

  return null;
}

function StartButton({ sessionId }: { sessionId: string }) {
  const { isDisabled, warningMessage } = useListenButtonState(sessionId);
  const handleClick = useStartListening(sessionId);
  const openNew = useTabs((state) => state.openNew);

  const handleConfigureAction = useCallback(() => {
    openNew({ type: "ai", state: { tab: "transcription" } });
  }, [openNew]);

  const button = (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn([
        "bg-white text-neutral-900 hover:bg-neutral-100 w-[110px]",
        "gap-1.5",
      ])}
      title={warningMessage || "Start listening"}
      aria-label="Start listening"
    >
      <RecordingIcon disabled={true} />
      <span className="text-neutral-900 hover:text-neutral-800">
        Start listening
      </span>
    </Button>
  );

  if (!warningMessage) {
    return button;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span className="inline-block">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <ActionableTooltipContent
          message={warningMessage}
          action={{
            label: "Configure",
            handleClick: handleConfigureAction,
          }}
        />
      </TooltipContent>
    </Tooltip>
  );
}

function InMeetingIndicator({ sessionId }: { sessionId: string }) {
  const [ref, hovered] = useHover();

  const { mode, stop, amplitude, muted, loadingPhase } = useListener(
    (state) => ({
      mode: state.getSessionMode(sessionId),
      stop: state.stop,
      amplitude: state.live.amplitude,
      muted: state.live.muted,
      loadingPhase: state.live.loadingPhase,
    }),
  );

  const active = mode === "active" || mode === "finalizing";
  const finalizing = mode === "finalizing";
  const initializing =
    loadingPhase === "audio_initializing" || loadingPhase === "connecting";

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
          ? ["text-neutral-500", "bg-neutral-100", "cursor-wait"]
          : ["text-red-500 hover:text-red-600", "bg-red-50 hover:bg-red-100"],
        "w-[110px]",
      ])}
      title={finalizing ? "Finalizing" : "Stop listening"}
      aria-label={finalizing ? "Finalizing" : "Stop listening"}
    >
      {finalizing ? (
        <div className="flex items-center gap-1.5">
          <span className="animate-pulse">...</span>
        </div>
      ) : initializing ? (
        <div className="flex items-center gap-1.5">
          <span className="animate-pulse text-red-500">Initializing...</span>
        </div>
      ) : (
        <>
          <div
            className={cn([
              "relative flex items-center gap-1.5",
              hovered ? "hidden" : "flex",
            ])}
          >
            {muted && <MicOff size={14} />}
            <ScrollingWaveform
              amplitude={
                ((amplitude.mic + amplitude.speaker) / 2 / 65535) * 100 * 1000
              }
              color="#ef4444"
              height={16}
              width={muted ? 75 : 95}
              barWidth={3}
              gap={1}
              minBarHeight={2}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: muted ? 18 : 0,
                width: 12,
                height: "100%",
                background:
                  "linear-gradient(to right, rgb(254 242 242), transparent)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 12,
                height: "100%",
                background:
                  "linear-gradient(to left, rgb(254 242 242), transparent)",
                pointerEvents: "none",
              }}
            />
          </div>
          <div
            className={cn([
              "flex items-center gap-1.5",
              hovered ? "flex" : "hidden",
            ])}
          >
            <span className="w-3 h-3 bg-red-500 rounded-none" />
            <span>Stop</span>
          </div>
        </>
      )}
    </Button>
  );
}
