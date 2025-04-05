import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MicIcon, MicOffIcon, PauseIcon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { toast } from "@hypr/ui/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

interface ListenButtonProps {
  sessionId: string;
}

export default function ListenButton({ sessionId }: ListenButtonProps) {
  const [open, setOpen] = useState(false);

  const modelDownloaded = useQuery({
    queryKey: ["check-stt-model-downloaded"],
    refetchInterval: 1000,
    queryFn: async () => {
      const currentModel = await localSttCommands.getCurrentModel();
      const isDownloaded = await localSttCommands.isModelDownloaded(currentModel);
      return isDownloaded;
    },
  });

  const ongoingSessionStore = useOngoingSession((s) => ({
    start: s.start,
    pause: s.pause,
    isCurrent: s.sessionId === sessionId,
    status: s.status,
    timeline: s.timeline,
  }));

  const startedBefore = useSession(sessionId, (s) => s.session.conversations.length > 0);
  const showResumeButton = ongoingSessionStore.status === "inactive" && startedBefore;

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
  }, [ongoingSessionStore.status, refetchMicMuted, refetchSpeakerMuted]);

  const toggleMicMuted = useMutation({
    mutationFn: async () => {
      await listenerCommands.setMicMuted(!isMicMuted);
      return undefined;
    },
    onSuccess: () => {
      refetchMicMuted();
    },
  });

  const toggleSpeakerMuted = useMutation({
    mutationFn: async () => {
      await listenerCommands.setSpeakerMuted(!isSpeakerMuted);
      return undefined;
    },
    onSuccess: () => {
      refetchSpeakerMuted();
    },
  });

  const handleStartSession = () => {
    if (ongoingSessionStore.status === "inactive") {
      ongoingSessionStore.start(sessionId);

      toast({
        id: "recording-consent",
        title: "Recording Started",
        content: "Ensure you have consent from everyone in the meeting",
        dismissible: true,
        duration: 3000,
      });
    }
  };

  const handleStopSession = () => {
    ongoingSessionStore.pause();
    setOpen(false);
  };

  if (ongoingSessionStore.status === "active" && !ongoingSessionStore.isCurrent) {
    return null;
  }

  return (
    <>
      {ongoingSessionStore.status === "loading" && (
        <div className="w-9 h-9 flex items-center justify-center">
          <Spinner color="black" />
        </div>
      )}
      {showResumeButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              disabled={!modelDownloaded.data}
              onClick={handleStartSession}
              className="w-16 h-9 rounded-full bg-red-100 border-2 transition-all hover:scale-95 border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center text-xs text-red-600 font-medium"
              style={{
                boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
              }}
            >
              <Trans>Resume</Trans>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <p>
              <Trans>Resume recording</Trans>
            </p>
          </TooltipContent>
        </Tooltip>
      )}
      {ongoingSessionStore.status === "inactive" && !showResumeButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              disabled={!modelDownloaded.data}
              onClick={handleStartSession}
              className="w-9 h-9 rounded-full bg-red-500 border-2 transition-all hover:scale-95 border-neutral-400 cursor-pointer outline-none p-0 flex items-center justify-center"
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
      )}

      {ongoingSessionStore.status === "active" && (
        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  onClick={handleStartSession}
                  className="w-14 h-9 rounded-full bg-red-100 border-2 transition-all hover:scale-95 border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center"
                  style={{
                    boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
                  }}
                >
                  <SoundIndicator color="#ef4444" size="long" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              <p>
                <Trans>Pause recording</Trans>
              </p>
            </TooltipContent>
          </Tooltip>

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

            <Button
              variant="destructive"
              onClick={handleStopSession}
              className="w-full"
            >
              <PauseIcon size={16} />
              <Trans>Pause recording</Trans>
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
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
    ? (isMuted ? MicOffIcon : MicIcon)
    : (isMuted ? VolumeOffIcon : Volume2Icon);

  return (
    <Button variant="ghost" size="icon" onClick={onToggle} className="w-full">
      <Icon className={isMuted ? "text-neutral-500" : ""} size={20} />
      <SoundIndicator input={type} size="long" />
    </Button>
  );
}
