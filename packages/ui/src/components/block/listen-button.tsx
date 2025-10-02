import {
  CheckIcon,
  ChevronDownIcon,
  MicIcon,
  MicOffIcon,
  PlayIcon,
  StopCircleIcon,
  Volume2Icon,
  VolumeOffIcon,
} from "lucide-react";
import { useState } from "react";

import { SoundIndicator } from "@hypr/ui/components/block/sound-indicator";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import ShinyButton from "@hypr/ui/components/ui/shiny-button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";

export type ListenButtonState =
  | "loading"
  | "inactive_meeting_not_ended"
  | "inactive_meeting_ended"
  | "running_active_this_session"
  | "running_active_other_session";

export function ListenButton(
  {
    state,
    isOnboarding,
    disabled,
    isCompact = false,
    handleStartSession,
    handleStopSession,
    muted,
    amplitude,
    setMicMuted,
    setSpeakerMuted,
    currentDevice,
    availableDevices,
    handleSelectDevice,
    handleOpenMicSelectorPopover,
  }: {
    state: ListenButtonState;
    isOnboarding: boolean;
    disabled: boolean;
    isCompact?: boolean;
    handleStartSession: () => void;
    handleStopSession: () => void;
    muted: { mic: boolean; speaker: boolean };
    amplitude: { mic: number; speaker: number };
    setMicMuted: () => void;
    setSpeakerMuted: () => void;
    currentDevice?: string;
    availableDevices?: string[];
    handleSelectDevice: (device: string) => void;
    handleOpenMicSelectorPopover?: () => void;
  },
) {
  switch (state) {
    case "loading":
      return (
        <div className="w-9 h-9 flex items-center justify-center">
          <Spinner color="black" />
        </div>
      );

    case "inactive_meeting_not_ended":
      return isOnboarding
        ? <WhenInactiveAndMeetingNotEndedOnboarding disabled={disabled} onClick={handleStartSession} />
        : <WhenInactiveAndMeetingNotEnded disabled={disabled} onClick={handleStartSession} />;

    case "inactive_meeting_ended":
      return isOnboarding
        ? <WhenInactiveAndMeetingEndedOnboarding disabled={disabled} onClick={handleStartSession} />
        : <WhenInactiveAndMeetingEnded disabled={disabled} onClick={handleStartSession} isCompact={isCompact} />;

    case "running_active_this_session":
      return (
        <WhenActive
          muted={muted}
          setMicMuted={setMicMuted}
          setSpeakerMuted={setSpeakerMuted}
          disabled={isOnboarding}
          handleStopSession={handleStopSession}
          amplitude={amplitude}
          currentDevice={currentDevice}
          availableDevices={availableDevices}
          handleSelectDevice={handleSelectDevice}
          handleOpenMicSelectorPopover={handleOpenMicSelectorPopover}
        />
      );

    case "running_active_other_session":
      return null;
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
        Start recording
      </TooltipContent>
    </Tooltip>
  );
}

function WhenInactiveAndMeetingEnded(
  { disabled, onClick, isCompact = false }: { disabled: boolean; onClick: () => void; isCompact?: boolean },
) {
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
      {disabled ? "Wait..." : isHovered ? "Resume" : "Ended"}
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
        !disabled
          ? "hover:scale-95"
          : "opacity-50 cursor-progress",
      ])}
      style={{
        boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
      }}
    >
      <PlayIcon size={14} />
      {disabled ? "Wait..." : "Play video"}
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
      {disabled ? "Wait..." : "Play again"}
    </button>
  );
}

function WhenActive(
  {
    disabled,
    handleStopSession,
    amplitude,
    muted,
    setMicMuted,
    setSpeakerMuted,
    currentDevice,
    availableDevices,
    handleSelectDevice,
    handleOpenMicSelectorPopover,
  }: {
    disabled: boolean;
    handleStopSession: () => void;
    amplitude: { mic: number; speaker: number };
    muted: { mic: boolean; speaker: boolean };
    setMicMuted: () => void;
    setSpeakerMuted: () => void;
    currentDevice?: string;
    availableDevices?: string[];
    handleSelectDevice: (device: string) => void;
    handleOpenMicSelectorPopover?: () => void;
  },
) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleStopSessionWrapper = () => {
    setIsPopoverOpen(false);
    handleStopSession();
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn([
            isPopoverOpen && "hover:scale-95",
            "w-14 h-9 rounded-full bg-red-100 border-2 transition-all border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center",
            "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
          ])}
        >
          <SoundIndicator value={[amplitude.mic, amplitude.speaker]} color="#ef4444" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <RecordingControls
          disabled={disabled}
          micMuted={muted.mic}
          speakerMuted={muted.speaker}
          setMicMuted={setMicMuted}
          setSpeakerMuted={setSpeakerMuted}
          amplitude={amplitude}
          onStop={handleStopSessionWrapper}
          currentDevice={currentDevice}
          availableDevices={availableDevices}
          handleSelectDevice={handleSelectDevice}
          handleOpenMicSelectorPopover={handleOpenMicSelectorPopover}
        />
      </PopoverContent>
    </Popover>
  );
}

function RecordingControls({
  disabled,
  micMuted,
  speakerMuted,
  setMicMuted,
  setSpeakerMuted,
  amplitude,
  onStop,
  currentDevice,
  availableDevices,
  handleSelectDevice,
  handleOpenMicSelectorPopover,
}: {
  disabled: boolean;
  micMuted: boolean;
  speakerMuted: boolean;
  setMicMuted: () => void;
  setSpeakerMuted: () => void;
  amplitude: { mic: number; speaker: number };
  onStop: () => void;
  currentDevice?: string;
  availableDevices?: string[];
  handleSelectDevice: (device: string) => void;
  handleOpenMicSelectorPopover?: () => void;
}) {
  return (
    <>
      <div className="flex gap-2 w-full justify-between mb-3">
        <MicrophoneSelector
          disabled={disabled}
          isMuted={micMuted}
          amplitude={amplitude.mic}
          onToggleMuted={setMicMuted}
          currentDevice={currentDevice}
          availableDevices={availableDevices}
          handleSelectDevice={handleSelectDevice}
          handleOpenPopover={handleOpenMicSelectorPopover}
        />
        <SpeakerButton
          disabled={disabled}
          isMuted={speakerMuted}
          amplitude={amplitude.speaker}
          onClick={setSpeakerMuted}
        />
      </div>

      <StopButton onStop={onStop} />
    </>
  );
}

function StopButton({ onStop }: { onStop: (templateId: string | null) => void }) {
  return (
    <Button
      variant="destructive"
      className="w-full flex-1 justify-center text-xs"
      onClick={() => onStop(null)}
    >
      <StopCircleIcon
        color="white"
        className="w-4 h-4"
      />
      Stop
    </Button>
  );
}

function MicrophoneSelector({
  isMuted,
  amplitude,
  onToggleMuted,
  disabled,
  currentDevice,
  availableDevices,
  handleSelectDevice,
  handleOpenPopover,
}: {
  isMuted?: boolean;
  amplitude: number;
  onToggleMuted: () => void;
  disabled?: boolean;
  currentDevice?: string;
  availableDevices?: string[];
  handleSelectDevice: (device: string) => void;
  handleOpenPopover?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const Icon = isMuted ? MicOffIcon : MicIcon;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && handleOpenPopover) {
      handleOpenPopover();
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <div className="flex h-10 rounded-lg border border-input overflow-hidden bg-background">
          <button
            className="flex-1 min-w-0 flex items-center justify-center gap-2 transition-all hover:bg-accent focus-visible:outline-none focus-visible:bg-accent disabled:opacity-50 disabled:pointer-events-none"
            disabled={disabled}
            onClick={onToggleMuted}
          >
            <Icon
              className={cn(
                "flex-shrink-0 transition-colors",
                isMuted ? "text-neutral-400" : "text-neutral-700",
                disabled && "text-neutral-300 opacity-50",
              )}
              size={18}
            />
            {!disabled && (
              <div className="flex-1 flex items-center justify-center">
                <SoundIndicator value={amplitude} />
              </div>
            )}
          </button>

          <div className="w-px bg-border" />

          <PopoverTrigger asChild>
            <button
              className="px-1.5 flex-shrink-0 flex items-center justify-center transition-all hover:bg-accent focus-visible:outline-none focus-visible:bg-accent disabled:opacity-50 disabled:pointer-events-none"
              disabled={disabled}
            >
              <ChevronDownIcon className="w-4 h-4 text-neutral-600" />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-64 p-0" align="end">
          <div className="p-2">
            <div className="mb-2 px-2">
              <span className="text-sm font-medium">Microphone</span>
            </div>

            {!availableDevices
              ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-600 mx-auto"></div>
                  <p className="text-sm text-neutral-500 mt-2">Loading devices...</p>
                </div>
              )
              : availableDevices?.length === 0
              ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-neutral-500">No microphones found</p>
                </div>
              )
              : (
                <div className="space-y-1">
                  {availableDevices?.map((device) => {
                    const isSelected = device === currentDevice;
                    return (
                      <Button
                        key={device}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left h-8 px-2",
                          isSelected && "bg-neutral-100",
                        )}
                        onClick={() => {
                          handleSelectDevice(device);
                          setIsOpen(false);
                        }}
                      >
                        <Icon className="w-4 h-4 mr-2 flex-shrink-0 text-neutral-600" />
                        <span className="text-sm truncate flex-1">{device}</span>
                        {isSelected && <CheckIcon className="w-4 h-4 ml-auto flex-shrink-0 text-green-600" />}
                      </Button>
                    );
                  })}
                </div>
              )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SpeakerButton({
  isMuted,
  onClick,
  disabled,
  amplitude,
}: {
  isMuted?: boolean;
  onClick: () => void;
  disabled?: boolean;
  amplitude: number;
}) {
  const Icon = isMuted ? VolumeOffIcon : Volume2Icon;

  return (
    <div className="flex-1 min-w-0">
      <Button
        variant="outline"
        onClick={onClick}
        className="w-full h-10 flex items-center justify-center gap-2 transition-all hover:border-neutral-300"
        disabled={disabled}
      >
        <Icon
          className={cn(
            "flex-shrink-0 transition-colors",
            isMuted ? "text-neutral-400" : "text-neutral-700",
            disabled && "text-neutral-300 opacity-50",
          )}
          size={18}
        />
        {!disabled && (
          <div className="flex-1 flex items-center justify-center">
            <SoundIndicator value={amplitude} />
          </div>
        )}
      </Button>
    </div>
  );
}
