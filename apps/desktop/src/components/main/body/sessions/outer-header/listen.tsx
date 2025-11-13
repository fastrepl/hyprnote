import { useHover } from "@uidotdev/usehooks";
import { MicOff } from "lucide-react";
import { useCallback } from "react";

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
import { SoundIndicator } from "../../shared";
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
      ) : hovered ? (
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-red-500 rounded-none" />
          <span>Stop</span>
        </div>
      ) : muted ? (
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
      ) : (
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
