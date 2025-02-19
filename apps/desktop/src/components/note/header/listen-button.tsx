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
        "flex items-center gap-2 rounded-lg border border-border p-2 transition-all hover:scale-95",
        isListening
          ? "bg-primary text-white hover:bg-primary/80"
          : "bg-white text-primary hover:bg-primary/20",
        isListening && "border-primary/30",
      ])}
    >
      {isListening ? <Ear size={20} /> : <EarOff size={20} />}
      {isListening && <AudioIndicator />}
    </button>
  );

  if (!isListening) {
    return button;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent className="w-fit" align="end">
        <div className="flex flex-col items-center gap-3 py-1">
          <div className="text-sm font-medium">Is your meeting over?</div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onStop}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
            >
              Yes, stop recording
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
