import { useHover } from "@uidotdev/usehooks";
import { MicOff } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amplitudesRef = useRef<number[]>([]);
  const amplitudeRef = useRef(amplitude);

  amplitudeRef.current = amplitude;

  const dprRef = useRef(window.devicePixelRatio || 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, [width, height]);

  useEffect(() => {
    amplitudesRef.current = [];

    const draw = () => {
      const amp = amplitudeRef.current;
      // Amplitude is now in [0, 1000] range from Rust (RMS + dB normalized)
      // Normalize to [0, 1], apply noise gate, and visual curve
      const normalized = Math.min(amp / 1000, 1.0);
      const gated = normalized < 0.05 ? 0 : normalized;
      const visualAmplitude = Math.pow(gated, 0.7);

      amplitudesRef.current.push(visualAmplitude);
      if (amplitudesRef.current.length > maxBars) {
        amplitudesRef.current = amplitudesRef.current.slice(-maxBars);
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      const amplitudes = amplitudesRef.current;
      const startX = width - amplitudes.length * (barWidth + gap);

      ctx.fillStyle = color;
      amplitudes.forEach((amp, index) => {
        const barHeight =
          minBarHeight + amp * (resolvedMaxBarHeight - minBarHeight);
        const x = startX + index * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      });
    };

    draw();
    const interval = setInterval(draw, 100);
    return () => clearInterval(interval);
  }, [
    color,
    height,
    width,
    barWidth,
    gap,
    minBarHeight,
    resolvedMaxBarHeight,
    maxBars,
  ]);

  return <canvas ref={canvasRef} style={{ width, height }} />;
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
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn([
        "inline-flex items-center justify-center rounded-md text-xs font-medium",
        "bg-white text-neutral-900 hover:bg-neutral-100",
        "gap-1.5",
        "w-[114px] h-7",
        "disabled:pointer-events-none disabled:opacity-50",
      ])}
      title={warningMessage || "Start listening"}
      aria-label="Start listening"
    >
      <RecordingIcon disabled={true} />
      <span className="text-neutral-900 hover:text-neutral-800">
        Start listening
      </span>
    </button>
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

  const { mode, stop, amplitude, muted } = useListener((state) => ({
    mode: state.getSessionMode(sessionId),
    stop: state.stop,
    amplitude: state.live.amplitude,
    muted: state.live.muted,
  }));

  const active = mode === "active" || mode === "finalizing";
  const finalizing = mode === "finalizing";

  if (!active) {
    return null;
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={finalizing ? undefined : stop}
      disabled={finalizing}
      className={cn([
        "inline-flex items-center justify-center rounded-md text-sm font-medium",
        finalizing
          ? ["text-neutral-500", "bg-neutral-100", "cursor-wait"]
          : ["text-red-500 hover:text-red-600", "bg-red-50 hover:bg-red-100"],
        "w-[114px] h-7",
        "disabled:pointer-events-none disabled:opacity-50",
      ])}
      title={finalizing ? "Finalizing" : "Stop listening"}
      aria-label={finalizing ? "Finalizing" : "Stop listening"}
    >
      {finalizing ? (
        <div className="flex items-center gap-1.5">
          <span className="animate-pulse">...</span>
        </div>
      ) : (
        <>
          <div
            className={cn([
              "flex items-center gap-1.5",
              hovered ? "hidden" : "flex",
            ])}
          >
            {muted && <MicOff size={14} />}
            <ScrollingWaveform
              amplitude={(amplitude.mic + amplitude.speaker) / 2}
              color="#ef4444"
              height={26}
              width={muted ? 68 : 88}
              barWidth={2}
              gap={1}
              minBarHeight={2}
              maxBarHeight={26}
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
    </button>
  );
}
