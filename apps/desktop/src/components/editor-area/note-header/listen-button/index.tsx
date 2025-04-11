import { useMutation, useQuery } from "@tanstack/react-query";
import { MicIcon, MicOffIcon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent } from "@hypr/ui/components/ui/popover";
import { toast } from "@hypr/ui/components/ui/toast";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { ActiveRecordButton, InitialRecordButton, LoadingButton, ResumeButton, StopRecordingButton } from "./buttons";

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
    timeline: s.timeline,
  }));

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

  const startedBefore = useSession(
    sessionId,
    (s) => s.session.conversations.length > 0,
  );
  const showResumeButton = ongoingSessionStore.status === "inactive" && startedBefore;

  const sessionData = useSession(sessionId, (s) => ({
    session: s.session,
  }));

  const isEnhanced = sessionData.session.enhanced_memo_html;

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

  useEffect(() => {
    if (ongoingSessionStore.status === "active") {
      toast({
        id: "recording-consent",
        title: "Recording Started",
        content: "Ensure you have consent from everyone in the meeting",
        dismissible: true,
        duration: 3000,
      });
    }
  }, [ongoingSessionStore.status]);

  const handleStartSession = () => {
    if (ongoingSessionStore.status === "inactive") {
      ongoingSessionStore.start(sessionId);
    }
  };

  const handleStopSession = () => {
    ongoingSessionStore.pause();
    setOpen(false);
  };

  if (
    ongoingSessionStore.status === "active"
    && !ongoingSessionStore.isCurrent
  ) {
    return null;
  }

  return (
    <>
      {ongoingSessionStore.status === "loading" && <LoadingButton />}

      {showResumeButton && (
        <ResumeButton
          disabled={!modelDownloaded.data}
          onClick={handleStartSession}
          isEnhanced={!!isEnhanced}
        />
      )}

      {ongoingSessionStore.status === "inactive" && !showResumeButton && (
        <InitialRecordButton
          disabled={!modelDownloaded.data}
          onClick={handleStartSession}
        />
      )}

      {ongoingSessionStore.status === "active" && (
        <Popover open={open} onOpenChange={setOpen}>
          <ActiveRecordButton onClick={handleStartSession} />

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

            <StopRecordingButton onClick={handleStopSession} />
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
