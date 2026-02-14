import { useHover } from "@uidotdev/usehooks";
import { MicOff, TriangleAlert } from "lucide-react";
import { useCallback } from "react";

import type { DegradedError } from "@hypr/plugin-listener";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
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
        "w-20 h-7",
        "disabled:pointer-events-none disabled:opacity-50",
      ])}
      title={warningMessage || "Listen"}
      aria-label="Listen"
    >
      <RecordingIcon />
      <span className="text-neutral-900 hover:text-neutral-800">Listen</span>
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

function degradedMessage(error: DegradedError): string {
  switch (error.type) {
    case "authentication_failed":
      return `Authentication failed (${error.provider})`;
    case "upstream_unavailable":
      return "Transcription service unavailable";
    case "connection_timeout":
      return "Transcription connection timed out";
    case "stream_error":
      return "Transcription stream error";
    case "channel_overflow":
      return "Audio channel overflow";
  }
}

function InMeetingIndicator({ sessionId }: { sessionId: string }) {
  const [ref, hovered] = useHover();

  const { mode, stop, amplitude, muted, degraded } = useListener((state) => ({
    mode: state.getSessionMode(sessionId),
    stop: state.stop,
    amplitude: state.live.amplitude,
    muted: state.live.muted,
    degraded: state.live.degraded,
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
        "w-20 h-7",
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
            {degraded !== null && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <TriangleAlert
                    size={14}
                    className="text-amber-500 shrink-0"
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{degradedMessage(degraded)}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {muted && <MicOff size={14} />}
            <DancingSticks
              amplitude={Math.min(
                (amplitude.mic + amplitude.speaker) / 2000,
                1,
              )}
              color="#ef4444"
              height={18}
              width={60}
            />
          </div>
          <div
            className={cn([
              "flex items-center gap-1.5",
              hovered ? "flex" : "hidden",
            ])}
          >
            <span className="size-2 bg-red-500 rounded-none" />
            <span className="text-xs">Stop</span>
          </div>
        </>
      )}
    </button>
  );
}
