import { Trans } from "@lingui/react/macro";
import { PauseIcon } from "lucide-react";

import SoundIndicator from "@/components/sound-indicator";
import { MicrophoneSelector } from "./microphone-selector";
import { Button } from "@hypr/ui/components/ui/button";
import { PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";

interface ButtonBaseProps {
  disabled?: boolean;
  onClick: () => void;
  isEnhanced?: boolean;
}

export const LoadingButton = () => {
  return (
    <div className="w-9 h-9 flex items-center justify-center">
      <Spinner color="black" />
    </div>
  );
};

export const ResumeButton = ({
  disabled,
  onClick,
  isEnhanced,
}: ButtonBaseProps) => {
  return (
    <MicrophoneSelector>
      <button
        disabled={disabled}
        onClick={onClick}
        className={`w-16 h-9 rounded-full transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center text-xs font-medium ${
          isEnhanced
            ? "bg-neutral-200 border-2 border-neutral-400 text-neutral-600 opacity-30 hover:opacity-100 hover:bg-red-100 hover:text-red-600 hover:border-red-400"
            : "bg-red-100 border-2 border-red-400 text-red-600"
        }`}
        style={{
          boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
        }}
      >
        <Trans>Resume</Trans>
      </button>
    </MicrophoneSelector>
  );
};

export const InitialRecordButton = ({ disabled, onClick }: ButtonBaseProps) => {
  return (
    <MicrophoneSelector>
      <button
        disabled={disabled}
        onClick={onClick}
        className="w-9 h-9 rounded-full bg-red-500 border-2 transition-all hover:scale-95 border-neutral-400 cursor-pointer outline-none p-0 flex items-center justify-center"
        style={{
          boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
        }}
      ></button>
    </MicrophoneSelector>
  );
};

export const ActiveRecordButton = ({ onClick }: ButtonBaseProps) => {
  return (
    <MicrophoneSelector>
      <PopoverTrigger asChild>
        <button
          onClick={onClick}
          className="w-14 h-9 rounded-full bg-red-100 border-2 transition-all hover:scale-95 border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center"
          style={{
            boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
          }}
        >
          <SoundIndicator color="#ef4444" size="long" />
        </button>
      </PopoverTrigger>
    </MicrophoneSelector>
  );
};

// Stop recording button
export const StopRecordingButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button variant="destructive" onClick={onClick} className="w-full">
      <PauseIcon size={16} />
      <Trans>Pause recording</Trans>
    </Button>
  );
};
