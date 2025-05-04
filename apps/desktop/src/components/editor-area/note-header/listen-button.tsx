import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { MicIcon, MicOffIcon, PauseIcon, PlayIcon, StopCircleIcon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { useHypr } from "@/contexts";
import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { toast } from "@hypr/ui/components/ui/toast";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import ShinyButton from "./shiny-button";

export default function ListenButton({ sessionId }: { sessionId: string }) {
  const { userId, onboardingSessionId } = useHypr();
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
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);
  const ongoingSessionStore = useOngoingSession((s) => ({
    start: s.start,
    resume: s.resume,
    pause: s.pause,
    stop: s.stop,
    loading: s.loading,
  }));

  const prevOngoingSessionStatus = usePreviousValue(ongoingSessionStatus);

  const isEnhancePending = useEnhancePendingState(sessionId);
  const nonEmptySession = useSession(
    sessionId,
    (s) => s.session.conversations.length > 0 || s.session.enhanced_memo_html,
  );
  const meetingEnded = isEnhancePending || nonEmptySession;

  useEffect(() => {
    if (ongoingSessionStatus === "running_active" && prevOngoingSessionStatus === "inactive") {
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

      analyticsCommands.event({
        event: "onboarding_video_started",
        distinct_id: userId,
        session_id: sessionId,
      });
    }
  };

  const handleResumeSession = () => {
    ongoingSessionStore.resume();
  };

  if (ongoingSessionStore.loading) {
    return (
      <div className="w-9 h-9 flex items-center justify-center">
        <Spinner color="black" />
      </div>
    );
  }

  if (ongoingSessionStatus === "running_paused" && sessionId === ongoingSessionId) {
    return (
      <button
        disabled={!modelDownloaded.data}
        onClick={handleResumeSession}
        className={cn(
          "w-16 h-9 rounded-full transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center text-xs font-medium",
          "bg-red-100 border-2 border-red-400 text-red-600",
          "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
        )}
      >
        <Trans>Resume</Trans>
      </button>
    );
  }

  if (ongoingSessionStatus === "inactive") {
    if (!meetingEnded) {
      if (sessionId === onboardingSessionId) {
        return (
          <WhenInactiveAndMeetingNotEndedOnboarding
            disabled={!modelDownloaded.data}
            onClick={handleStartSession}
          />
        );
      } else {
        return (
          <WhenInactiveAndMeetingNotEnded
            disabled={!modelDownloaded.data}
            onClick={handleStartSession}
          />
        );
      }
    } else {
      if (sessionId === onboardingSessionId) {
        return (
          <WhenInactiveAndMeetingEndedOnboarding
            disabled={!modelDownloaded.data || isEnhancePending}
            onClick={handleStartSession}
          />
        );
      } else {
        return (
          <WhenInactiveAndMeetingEnded
            disabled={!modelDownloaded.data || isEnhancePending}
            onClick={handleStartSession}
          />
        );
      }
    }
  }

  if (ongoingSessionStatus === "running_active") {
    if (sessionId !== ongoingSessionId) {
      return null;
    }

    return <WhenActive />;
  }
}

function WhenInactiveAndMeetingNotEnded({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const [open, setOpen] = useState(false);
  const [instructionText, setInstructionText] = useState("");

  const configQuery = useQuery({
    queryKey: ["config", "general"],
    queryFn: async () => await dbCommands.getConfig(),
  });

  useEffect(() => {
    if (configQuery.data?.general?.jargons) {
      setInstructionText((configQuery.data.general.jargons ?? []).join(", "));
    }
  }, [configQuery.data]);

  const mutation = useMutation({
    mutationFn: async (jargons: string) => {
      if (!configQuery.data) {
        return;
      }

      const nextGeneral = {
        ...(configQuery.data.general ?? {}),
        jargons: [jargons],
      };
      await dbCommands.setConfig({
        ...configQuery.data,
        general: nextGeneral,
      });
    },
    onSuccess: () => {
      configQuery.refetch();
    },
    onError: console.error,
  });

  const handleSaveJargons = () => {
    const currentConfigJargons = (configQuery.data?.general?.jargons ?? []).join(", ");
    if (instructionText !== currentConfigJargons) {
      mutation.mutate(instructionText);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          handleSaveJargons();
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn([
            "w-9 h-9 rounded-full border-2 transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center",
            disabled ? "bg-neutral-200 dark:bg-zinc-700 border-neutral-400 dark:border-zinc-600" : "bg-red-500 border-neutral-400 dark:border-red-600",
            "shadow-[inset_0_0_0_2px_rgba(255,255,255,0.8)]",
          ])}
        >
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              <Trans>Custom instruction</Trans>
            </div>
            <Textarea
              value={instructionText}
              onChange={(e) => setInstructionText(e.target.value)}
              placeholder="ex) Hyprnote, JDCE, Fastrepl, John, Yujong"
              className="min-h-[80px] resize-none border-neutral-300 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              <Trans>
                Provide descriptions about the meeting. Company specific terms, acronyms, jargons... any thing!
              </Trans>
            </p>
          </div>

          <Button
            onClick={() => {
              handleSaveJargons();
              onClick();
              setOpen(false);
            }}
            disabled={disabled}
            className="w-full flex items-center gap-2"
          >
            <div className="relative flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="absolute top-0 left-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75"></div>
            </div>
            <Trans>Start Meeting</Trans>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WhenInactiveAndMeetingEnded({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-16 h-9 rounded-full transition-all outline-none p-0 flex items-center justify-center text-xs font-medium",
        "bg-neutral-200 dark:bg-zinc-700 border-2 border-neutral-400 dark:border-zinc-600 text-neutral-600 dark:text-neutral-300",
        "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
        !disabled
          ? "hover:opacity-100 hover:bg-red-100 hover:text-red-600 hover:border-red-400 dark:hover:bg-red-900 dark:hover:text-red-400 dark:hover:border-red-700 hover:scale-95 cursor-pointer"
          : "opacity-10 cursor-progress",
      )}
    >
      <Trans>{disabled ? "Wait..." : isHovered ? "Resume" : "Ended"}</Trans>
    </button>
  );
}

function WhenInactiveAndMeetingNotEndedOnboarding({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <ShinyButton
      disabled={disabled}
      onClick={onClick}
      className={cn([
        "w-24 h-9 rounded-full border-2 transition-all cursor-pointer outline-none p-0 flex items-center justify-center gap-1",
        "bg-neutral-800 border-neutral-700 text-white text-xs font-medium",
      ])}
      style={{
        boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
      }}
    >
      <PlayIcon size={14} />
      <Trans>Play video</Trans>
    </ShinyButton>
  );
}

function WhenInactiveAndMeetingEndedOnboarding({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-28 h-9 rounded-full outline-none p-0 flex items-center justify-center gap-1 text-xs font-medium",
        "bg-neutral-200 dark:bg-zinc-700 border-2 border-neutral-400 dark:border-zinc-600 text-neutral-600 dark:text-neutral-300",
        "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
        !disabled
          ? "hover:bg-neutral-300 hover:text-neutral-800 hover:border-neutral-500 dark:hover:bg-zinc-600 dark:hover:text-neutral-200 dark:hover:border-zinc-500 transition-all hover:scale-95 cursor-pointer"
          : "opacity-10 cursor-progress",
      )}
    >
      <PlayIcon size={14} />
      <Trans>{disabled ? "Wait..." : "Play again"}</Trans>
    </button>
  );
}

export function WhenActive() {
  const [open, setOpen] = useState(false);

  const { data: isMicMuted, refetch: refetchMicMuted } = useQuery({
    queryKey: ["mic-muted"],
    queryFn: () => listenerCommands.getMicMuted(),
  });

  const { data: isSpeakerMuted, refetch: refetchSpeakerMuted } = useQuery({
    queryKey: ["speaker-muted"],
    queryFn: () => listenerCommands.getSpeakerMuted(),
  });

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

  const ongoingSessionStore = useOngoingSession((s) => ({
    start: s.start,
    pause: s.pause,
    stop: s.stop,
    loading: s.loading,
  }));

  const handlePauseSession = () => {
    ongoingSessionStore.pause();
    setOpen(false);
  };

  const handleStopSession = () => {
    ongoingSessionStore.stop();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn([
            open && "hover:scale-95",
            "w-14 h-9 rounded-full bg-red-100 dark:bg-red-900 border-2 transition-all border-red-400 dark:border-red-700 cursor-pointer outline-none p-0 flex items-center justify-center",
            "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
          ])}
        >
          <SoundIndicator color="#ef4444" size="long" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-60" align="end">
        <div className="flex w-full justify-between mb-4">
          <AudioControlButton
            isMuted={isMicMuted}
            onClick={() => toggleMicMuted.mutate()}
            type="mic"
          />
          <AudioControlButton
            isMuted={isSpeakerMuted}
            onClick={() => toggleSpeakerMuted.mutate()}
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

function AudioControlButton({
  type,
  isMuted,
  onClick,
}: {
  type: "mic" | "speaker";
  isMuted?: boolean;
  onClick: () => void;
}) {
  const Icon = type === "mic"
    ? isMuted
      ? MicOffIcon
      : MicIcon
    : isMuted
    ? VolumeOffIcon
    : Volume2Icon;

  return (
    <Button variant="ghost" size="icon" onClick={onClick} className="w-full">
      <Icon className={isMuted ? "text-neutral-500" : ""} size={20} />
      <SoundIndicator input={type} size="long" />
    </Button>
  );
}
