import { useHover } from "@uidotdev/usehooks";
import { MicOff } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useListener } from "../../../../../contexts/listener";
import { useStartListening } from "../../../../../hooks/useStartListening";
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

  useEffect(() => {
    const draw = () => {
      const amp = amplitudeRef.current;
      const linear = amp < 30 ? 0 : Math.min((amp - 30) / 40, 1);
      const normalized = Math.pow(linear, 0.6);

      amplitudesRef.current.push(normalized);
      if (amplitudesRef.current.length > maxBars) {
        amplitudesRef.current = amplitudesRef.current.slice(-maxBars);
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

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
      <canvas ref={canvasRef} style={{ width, height }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
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
          background: "linear-gradient(to left, rgb(254 242 242), transparent)",
          pointerEvents: "none",
        }}
      />
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

  const handleConfigureAction = useCallback(() => {
    windowsCommands
      .windowShow({ type: "settings" })
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() =>
        windowsCommands.windowEmitNavigate(
          { type: "settings" },
          {
            path: "/app/settings",
            search: { tab: "transcription" },
          },
        ),
      );
  }, []);

  const button = (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn([
        "bg-white text-neutral-900 hover:bg-neutral-100",
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

  const { mode, stop, amplitude, muted } = useListener((state) => ({
    mode: state.getSessionMode(sessionId),
    stop: state.stop,
    amplitude: state.live.amplitude,
    muted: state.live.muted,
  }));

  const active = mode === "running_active" || mode === "finalizing";
  const finalizing = mode === "finalizing";

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
        "w-[75px]",
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
              height={16}
              width={75}
              barWidth={2}
              gap={1}
              minBarHeight={2}
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
