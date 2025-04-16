import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { MicIcon, MicOffIcon, PauseIcon, StopCircleIcon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { toast } from "@hypr/ui/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

interface ListenButtonProps {
  sessionId: string;
}

export default function ListenButton({ sessionId }: ListenButtonProps) {
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const modelDownloaded = useQuery({
    queryKey: ["check-stt-model-downloaded"],
    refetchInterval: 1000,
    queryFn: async () => {
      const currentModel = await localSttCommands.getCurrentModel();
      const isDownloaded = await localSttCommands.isModelDownloaded(
        currentModel,
      );
      return isDownloaded;
    },
  });

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const prevOngoingSessionStatus = usePreviousValue(ongoingSessionStatus);

  const ongoingSessionStore = useOngoingSession((s) => ({
    start: s.start,
    resume: s.resume,
    pause: s.pause,
    stop: s.stop,
    isCurrent: s.sessionId === sessionId,
    loading: s.loading,
    sessionId: s.sessionId,
  }));

  const isEnhancePending = useEnhancePendingState(sessionId);
  const nonEmptySession = useSession(
    sessionId,
    (s) => s.session.conversations.length > 0 || s.session.enhanced_memo_html,
  );
  const meetingEnded = isEnhancePending || nonEmptySession;

  const { data: isMicMuted, refetch: refetchMicMuted } = useQuery({
    queryKey: ["mic-muted"],
    queryFn: () => listenerCommands.getMicMuted(),
  });

  const { data: isSpeakerMuted, refetch: refetchSpeakerMuted } = useQuery({
    queryKey: ["speaker-muted"],
    queryFn: () => listenerCommands.getSpeakerMuted(),
  });

  useEffect(() => {
    refetchMicMuted();
    refetchSpeakerMuted();
  }, [ongoingSessionStatus, refetchMicMuted, refetchSpeakerMuted]);

  const toggleMicMuted = useMutation({
    mutationFn: () => listenerCommands.setMicMuted(!isMicMuted),
    onSuccess: () => {
      refetchMicMuted();
    },
  });

  const toggleSpeakerMuted = useMutation({
    mutationFn: () => listenerCommands.setSpeakerMuted(!isSpeakerMuted),
    onSuccess: () => {
      refetchSpeakerMuted();
    },
  });

  useEffect(() => {
    if (
      ongoingSessionStatus === "running_active"
      && prevOngoingSessionStatus === "inactive"
    ) {
      toast({
        id: "recording-consent",
        title: "Recording Started",
        content: "Ensure you have consent from everyone in the meeting",
        dismissible: true,
        duration: 3000,
      });
    }
  }, [ongoingSessionStatus]);

  const handleStartSession = () => {
    if (ongoingSessionStatus === "inactive") {
      ongoingSessionStore.start(sessionId);
    }
  };

  const handleResumeSession = () => {
    ongoingSessionStore.resume();
  };

  const handlePauseSession = () => {
    ongoingSessionStore.pause();
    setOpen(false);
  };

  const handleStopSession = () => {
    ongoingSessionStore.stop();
    setOpen(false);
  };

  if (ongoingSessionStore.loading) {
    return (
      <div className="w-9 h-9 flex items-center justify-center">
        <Spinner color="black" />
      </div>
    );
  }

  if (ongoingSessionStatus === "running_paused") {
    return (
      <button
        disabled={!modelDownloaded.data}
        onClick={handleResumeSession}
        className={cn(
          "w-16 h-9 rounded-full transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center text-xs font-medium",
          "bg-red-100 border-2 border-red-400 text-red-600",
        )}
        style={{
          boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
        }}
      >
        <Trans>Resume</Trans>
      </button>
    );
  }

  if (ongoingSessionStatus === "inactive") {
    if (!meetingEnded) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              disabled={!modelDownloaded.data}
              onClick={handleStartSession}
              className={cn([
                "w-9 h-9 rounded-full border-2 transition-all hover:scale-95  cursor-pointer outline-none p-0 flex items-center justify-center",
                !modelDownloaded.data
                  ? "bg-neutral-200 border-neutral-400"
                  : "bg-red-500 border-neutral-400",
              ])}
              style={{
                boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
              }}
            >
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <p>
              <Trans>Start recording</Trans>
            </p>
          </TooltipContent>
        </Tooltip>
      );
    } else {
      return (
        <button
          disabled={!modelDownloaded.data || isEnhancePending}
          onClick={handleStartSession}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "w-16 h-9 rounded-full transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center text-xs font-medium",
            "bg-neutral-200 border-2 border-neutral-400 text-neutral-600 opacity-30",
            !isEnhancePending
              && "hover:opacity-100 hover:bg-red-100 hover:text-red-600 hover:border-red-400",
          )}
          style={{ boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset" }}
        >
          <Trans>{isHovered ? "Resume" : "Ended"}</Trans>
        </button>
      );
    }
  }

  if (ongoingSessionStatus === "running_active") {
    if (!ongoingSessionStore.isCurrent) {
      return null;
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn([
              open && "hover:scale-95",
              "w-14 h-9 rounded-full bg-red-100 border-2 transition-all border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center",
            ])}
            style={{
              boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
            }}
          >
            <SoundIndicator color="#ef4444" size="long" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-60" align="end">
          <div className="flex w-full justify-between mb-4">
            <AudioControlButton
              isMuted={isMicMuted}
              onToggle={() => toggleMicMuted.mutate()}
              type="mic"
            />
            <AudioControlButton
              isMuted={isSpeakerMuted}
              onToggle={() => toggleSpeakerMuted.mutate()}
              type="speaker"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePauseSession}
              className="w-full"
            >
              <PauseIcon size={16} />
              <Trans>Pause</Trans>
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopSession}
              className="w-full"
            >
              <StopCircleIcon size={16} />
              <Trans>Stop</Trans>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
}

function AudioControlButton({
  isMuted,
  onToggle,
  type,
}: {
  isMuted?: boolean;
  onToggle: () => void;
  type: "mic" | "speaker";
}) {
  const Icon = type === "mic"
    ? isMuted
      ? MicOffIcon
      : MicIcon
    : isMuted
    ? VolumeOffIcon
    : Volume2Icon;

  return (
    <Button variant="ghost" size="icon" onClick={onToggle} className="w-full">
      <Icon className={isMuted ? "text-neutral-500" : ""} size={20} />
      <SoundIndicator input={type} size="long" />
    </Button>
  );
}
