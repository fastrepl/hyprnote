import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  ChevronDownIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PlayIcon,
  StopCircleIcon,
  Volume2Icon,
  VolumeOffIcon,
} from "lucide-react";
import { useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { useHypr } from "@/contexts";
import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { sonnerToast } from "@hypr/ui/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import ShinyButton from "./shiny-button";

export default function ListenButton({ sessionId }: { sessionId: string }) {
  const { onboardingSessionId } = useHypr();
  const isOnboarding = sessionId === onboardingSessionId;

  const modelDownloaded = useQuery({
    queryKey: ["check-stt-model-downloaded"],
    refetchInterval: 1000,
    queryFn: async () => {
      const currentModel = await localSttCommands.getCurrentModel();
      const isDownloaded = await localSttCommands.isModelDownloaded(currentModel);
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

  const isEnhancePending = useEnhancePendingState(sessionId);
  const nonEmptySession = useSession(
    sessionId,
    (s) => !!(s.session.words.length > 0 || s.session.enhanced_memo_html),
  );
  const meetingEnded = isEnhancePending || nonEmptySession;

  const handleStartSession = () => {
    if (ongoingSessionStatus === "inactive") {
      ongoingSessionStore.start(sessionId);
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
    const buttonProps = {
      disabled: !modelDownloaded.data || (meetingEnded && isEnhancePending),
      onClick: handleStartSession,
    };

    if (!meetingEnded) {
      return isOnboarding
        ? <WhenInactiveAndMeetingNotEndedOnboarding {...buttonProps} />
        : <WhenInactiveAndMeetingNotEnded {...buttonProps} />;
    } else {
      return isOnboarding
        ? <WhenInactiveAndMeetingEndedOnboarding {...buttonProps} />
        : <WhenInactiveAndMeetingEnded {...buttonProps} />;
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          disabled={disabled}
          onClick={onClick}
          className={cn([
            "w-9 h-9 rounded-full border-2 transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.8)]",
            disabled ? "bg-neutral-200 border-neutral-400" : "bg-red-500 border-neutral-400",
          ])}
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
        "bg-neutral-200 border-2 border-neutral-400 text-neutral-600",
        "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
        !disabled
          ? "hover:opacity-100 hover:bg-red-100 hover:text-red-600 hover:border-red-400 hover:scale-95 cursor-pointer"
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
        "bg-neutral-200 border-2 border-neutral-400 text-neutral-600",
        "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
        !disabled
          ? "hover:bg-neutral-300 hover:text-neutral-800 hover:border-neutral-500 transition-all hover:scale-95 cursor-pointer"
          : "opacity-10 cursor-progress",
      )}
    >
      <PlayIcon size={14} />
      <Trans>{disabled ? "Wait..." : "Play again"}</Trans>
    </button>
  );
}

function WhenActive() {
  const ongoingSessionStore = useOngoingSession((s) => ({
    pause: s.pause,
    stop: s.stop,
  }));
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handlePauseSession = () => {
    ongoingSessionStore.pause();
    setIsPopoverOpen(false);
  };

  const handleStopSession = () => {
    ongoingSessionStore.stop();
    setIsPopoverOpen(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn([
            isPopoverOpen && "hover:scale-95",
            "w-14 h-9 rounded-full bg-red-100 border-2 transition-all border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center",
            "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
          ])}
        >
          <SoundIndicator color="#ef4444" size="long" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <RecordingControls
          onPause={handlePauseSession}
          onStop={handleStopSession}
        />
      </PopoverContent>
    </Popover>
  );
}

function RecordingControls({
  onPause,
  onStop,
}: {
  onPause: () => void;
  onStop: () => void;
}) {
  const ongoingSessionMuted = useOngoingSession((s) => ({
    micMuted: s.micMuted,
    speakerMuted: s.speakerMuted,
  }));

  const toggleMicMuted = useMutation({
    mutationFn: () => listenerCommands.setMicMuted(!ongoingSessionMuted.micMuted),
  });

  const toggleSpeakerMuted = useMutation({
    mutationFn: () => listenerCommands.setSpeakerMuted(!ongoingSessionMuted.speakerMuted),
  });

  return (
    <>
      <div className="flex w-full justify-between mb-4">
        <AudioControlButton
          isMuted={ongoingSessionMuted.micMuted}
          onClick={() => toggleMicMuted.mutate()}
          type="mic"
        />
        <AudioControlButton
          isMuted={ongoingSessionMuted.speakerMuted}
          onClick={() => toggleSpeakerMuted.mutate()}
          type="speaker"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onPause}
          className="w-full"
        >
          <PauseIcon size={16} />
          <Trans>Pause</Trans>
        </Button>
        <Button
          variant="destructive"
          onClick={onStop}
          className="w-full"
        >
          <StopCircleIcon size={16} />
          <Trans>Stop</Trans>
        </Button>
      </div>
    </>
  );
}

function AudioControlButton({
  type,
  isMuted,
  onClick,
  disabled,
}: {
  type: "mic" | "speaker";
  isMuted?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = type === "mic"
    ? isMuted
      ? MicOffIcon
      : MicIcon
    : isMuted
    ? VolumeOffIcon
    : Volume2Icon;

  if (type === "mic") {
    return <MicControlWithDropdown isMuted={isMuted} onMuteClick={onClick} disabled={disabled} />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="w-full"
      disabled={disabled}
    >
      <Icon className={cn(isMuted ? "text-neutral-500" : "", disabled && "text-neutral-300")} size={20} />
      {!disabled && <SoundIndicator input={type} size="long" />}
    </Button>
  );
}

function parseDeviceData(result: string | null | undefined): { devices: string[]; selected?: string[] } | null {
  if (!result || !result.startsWith("DEVICES:")) {
    return null;
  }

  const devicesJson = result.substring(8);
  try {
    const parsedData = JSON.parse(devicesJson);

    // Check if it's the new format with devices and selected
    if (parsedData && typeof parsedData === "object" && parsedData.devices) {
      return parsedData;
    }

    // Fallback to old format (array of devices)
    if (Array.isArray(parsedData)) {
      return { devices: parsedData };
    }

    return null;
  } catch (e) {
    console.error("Failed to parse device data:", e);
    return null;
  }
}

function MicControlWithDropdown({
  isMuted,
  onMuteClick,
  disabled,
}: {
  isMuted?: boolean;
  onMuteClick: () => void;
  disabled?: boolean;
}) {
  const { t } = useLingui();

  const Icon = isMuted ? MicOffIcon : MicIcon;

  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => listenerCommands.checkMicrophoneAccess(),
  });

  const deviceQuery = useQuery({
    queryKey: ["microphoneDeviceInfo"],
    queryFn: async () => {
      const result = await listenerCommands.getSelectedMicrophoneDevice();
      return result;
    },
    enabled: micPermissionStatus.data === true,
  });

  const microphoneDevices = useQuery({
    queryKey: ["microphoneDevices", deviceQuery.data],
    queryFn: async () => {
      const result = deviceQuery.data;
      return parseDeviceData(result)?.devices || [];
    },
    enabled: micPermissionStatus.data === true && deviceQuery.data !== undefined,
  });

  const selectedDevice = useQuery({
    queryKey: ["selectedMicrophoneDevice", deviceQuery.data],
    queryFn: async () => {
      const result = deviceQuery.data;
      const parsedData = parseDeviceData(result);

      if (parsedData?.selected) {
        return parsedData.selected[0] || null; // Get first (and only) selected device
      }

      // If no parsed data or no selected field, return the original result
      return result || null;
    },
    enabled: micPermissionStatus.data === true && deviceQuery.data !== undefined,
  });

  const updateSelectedDevice = useMutation({
    mutationFn: (deviceName: string | null) => listenerCommands.setSelectedMicrophoneDevice(deviceName),
    onSuccess: (_, deviceName) => {
      const displayName = deviceName === null ? t`System Default` : deviceName;

      sonnerToast.success(t`Microphone switched to ${displayName}`, {
        duration: 2000,
      });

      // Force immediate refetch to ensure UI updates instantly
      deviceQuery.refetch();
      microphoneDevices.refetch();
      selectedDevice.refetch();
    },
    onError: (error, deviceName) => {
      const displayName = deviceName === null ? t`System Default` : deviceName;

      sonnerToast.error(t`Failed to switch to ${displayName}`, {
        description: t`Please try again or check your microphone permissions.`,
        duration: 4000,
      });

      // Even on error, refresh to show correct state
      deviceQuery.refetch();
      microphoneDevices.refetch();
      selectedDevice.refetch();
    },
  });

  const handleMicrophoneDeviceChange = (deviceName: string) => {
    const deviceToSet = deviceName === "default" ? null : deviceName;
    updateSelectedDevice.mutate(deviceToSet);
  };

  const getSelectedDevice = () => {
    const currentDevice = selectedDevice.data;
    if (!currentDevice) {
      return "default";
    }
    if (microphoneDevices.data && !microphoneDevices.data.includes(currentDevice)) {
      return "default";
    }
    return currentDevice;
  };

  const getDisplayName = (deviceName: string) => {
    if (deviceName === "default") {
      return t`System Default`;
    }
    return deviceName;
  };

  return (
    <div className="flex w-full">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMuteClick}
        className="flex-1"
        disabled={disabled}
      >
        <Icon className={cn(isMuted ? "text-neutral-500" : "", disabled && "text-neutral-300")} size={20} />
        {!disabled && <SoundIndicator input="mic" size="long" />}
      </Button>

      {micPermissionStatus.data && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 px-1"
              disabled={microphoneDevices.isLoading || updateSelectedDevice.isPending}
            >
              <ChevronDownIcon size={12} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                <Trans>Microphone</Trans>
              </div>

              {microphoneDevices.isLoading
                ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                    <Spinner size={14} />
                    <Trans>Loading devices...</Trans>
                  </div>
                )
                : microphoneDevices.error
                ? (
                  <div className="px-2 py-1.5 text-sm text-red-600">
                    <Trans>Failed to load microphone devices. Please check permissions.</Trans>
                  </div>
                )
                : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-8"
                      onClick={() => handleMicrophoneDeviceChange("default")}
                    >
                      <span className="truncate">{getDisplayName("default")}</span>
                      {getSelectedDevice() === "default" && <CheckIcon size={16} className="text-green-600" />}
                    </Button>

                    {microphoneDevices.data?.map((device) => (
                      <Button
                        key={device}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-8"
                        onClick={() => handleMicrophoneDeviceChange(device)}
                      >
                        <span className="truncate">{device}</span>
                        {getSelectedDevice() === device && <CheckIcon size={16} className="text-green-600" />}
                      </Button>
                    ))}
                  </>
                )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
