import { Ear, EarOff } from "lucide-react";
import clsx from "clsx";
import AudioIndicator from "./audio-indicator";

interface ListenButtonProps {
  isListening: boolean;
  onClick: () => void;
}

export default function ListenButton({
  isListening,
  onClick,
}: ListenButtonProps) {
  return (
    <button
      onClick={onClick}
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
}
