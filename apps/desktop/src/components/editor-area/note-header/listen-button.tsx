import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EarIcon, EarOffIcon, MicIcon, MicOffIcon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { toast } from "@hypr/ui/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useOngoingSession } from "@hypr/utils/contexts";

interface ListenButtonProps {
  sessionId: string;
}

export default function ListenButton({ sessionId }: ListenButtonProps) {
  const [open, setOpen] = useState(false);

  const ongoingSessionStore = useOngoingSession((s) => ({
    start: s.start,
    pause: s.pause,
    isCurrent: s.sessionId === sessionId,
    status: s.status,
  }));

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

  // TODO: Inactivity detection will be handled in the server

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
        <Button variant="outline" className="p-2" disabled>
          <div className="flex items-center justify-center size-5">
            <Spinner color="black" />
          </div>
        </Button>
      )}

      {ongoingSessionStore.status === "inactive" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={handleStartSession}
              className="p-2"
            >
              <EarOffIcon size={20} />
            </Button>
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
                <Button variant="default" className="p-2">
                  <EarIcon size={20} />
                  <SoundIndicator theme="light" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              <p>
                <Trans>Stop recording</Trans>
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
              <Trans>Stop listening</Trans>
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
