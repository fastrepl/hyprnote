import clsx from "clsx";
import { Ear } from "lucide-react";
import AudioIndicator from "../note/header/audio-indicator";

export function SessionIndicator() {
  return (
    <button
      className={clsx([
        "w-72",
        "hidden sm:flex",
        "flex-row items-center gap-2",
        "rounded-md border border-border px-2 py-2",
        "bg-transparent transition-colors duration-200 hover:bg-white",
        "text-neutral-500 hover:text-neutral-600",
      ])}
    >
      <Ear size={16} />
      <span className="text-xs">Return to session</span>
      <AudioIndicator />
    </button>
  );
}
