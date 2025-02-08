import { Ear, EarOff } from "lucide-react";
import clsx from "clsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import AudioIndicator from "./audio-indicator";

interface ListenButtonProps {
  isListening: boolean;
  onClick: () => void;
  onStop?: () => void;
}

export default function ListenButton({
  isListening,
  onClick,
  onStop,
}: ListenButtonProps) {
  const handleClick = () => {
    if (!isListening) {
      onClick();
    }
  };

  const button = (
    <button
      onClick={handleClick}
      className={clsx([
        "relative rounded-lg border border-border p-2 hover:bg-neutral-100",
        isListening ? "text-foreground/30" : "text-foreground/50",
        isListening && "border-primary/30",
      ])}
    >
      {isListening ? <Ear size={20} /> : <EarOff size={20} />}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AudioIndicator amplitude={0.5} />
        </div>
      )}
    </button>
  );

  if (!isListening) {
    return button;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {button}
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="flex flex-col gap-3 py-1">
          <div className="text-sm font-medium">Is your meeting over?</div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onStop}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              Yes, stop recording
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
